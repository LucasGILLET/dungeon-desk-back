// Outils partagés par les importeurs du seed SRD : client Prisma, lecture des
// fichiers sources, résolution des références et écriture des traductions.
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

export type Tx = Prisma.TransactionClient;
export type Json = any;

export const DATA_DIR = path.resolve(__dirname, '../../prisma/data');
export const LOCALES = ['en', 'fr'] as const;
export type LocaleCode = (typeof LOCALES)[number];

export function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.SEED_POOL_SIZE ?? 4) });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Une transaction par entité importée : un échec n'en laisse aucune à moitié écrite.
export const TX_OPTIONS = { timeout: 120_000, maxWait: 30_000 };

// --- Fichiers sources --------------------------------------------------------

export interface SrdFile {
  // Entrées anglaises (référence), dans l'ordre du fichier
  list: Json[];
  // Entrée d'une langue par index ; undefined si absente
  get(locale: LocaleCode, index: string): Json | undefined;
}

export function readJson(file: string): Json {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

export function loadSrd(edition: string, name: string): SrdFile {
  const byLocale = new Map<LocaleCode, Map<string, Json>>();
  for (const locale of LOCALES) {
    const file = path.join(edition, locale, `5e-SRD-${name}.json`);
    if (!fs.existsSync(path.join(DATA_DIR, file))) continue;
    const rows: Json[] = readJson(file);
    byLocale.set(locale, new Map(rows.map((row) => [row.index, row])));
  }
  const en = byLocale.get('en');
  if (!en) throw new Error(`Fichier de référence manquant : ${edition}/en/5e-SRD-${name}.json`);
  return {
    list: [...en.values()],
    get: (locale, index) => byLocale.get(locale)?.get(index),
  };
}

// --- Textes ------------------------------------------------------------------

// Le SRD stocke les descriptions en tableau de paragraphes : on les joint en Markdown.
export function text(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? value.join('\n\n') : null;
  return String(value);
}

// Lignes de traduction pour chaque langue disponible. `build` renvoie null pour
// ignorer une langue (entrée absente ou non traduite).
export function translationsFor(
  file: SrdFile,
  index: string,
  build: (row: Json, locale: LocaleCode) => Record<string, unknown> | null,
): { localeCode: LocaleCode; data: Record<string, unknown> }[] {
  const rows = [];
  for (const locale of LOCALES) {
    const row = file.get(locale, index);
    if (!row) continue;
    const data = build(row, locale);
    if (data) rows.push({ localeCode: locale, data });
  }
  return rows;
}

// Remplace en bloc les traductions d'une entité.
export async function replaceTranslations(
  tx: Tx,
  model: string,
  foreignKey: string,
  id: number,
  rows: { localeCode: string; data: Record<string, unknown> }[],
): Promise<void> {
  const delegate = (tx as any)[model];
  await delegate.deleteMany({ where: { [foreignKey]: id } });
  if (rows.length) {
    await delegate.createMany({
      data: rows.map((row) => ({ [foreignKey]: id, localeCode: row.localeCode, ...row.data })),
    });
  }
}

// --- Références --------------------------------------------------------------

// Index tiré d'une URL du SRD : "/api/2014/proficiencies/skill-arcana" → ["proficiencies", "skill-arcana"]
export function parseUrl(url: string): [string, string] {
  const parts = url.split('/').filter(Boolean);
  return [parts[parts.length - 2], parts[parts.length - 1]];
}

// Résout un index vers un id, avec cache. Les tables partagées n'ont pas d'editionId.
export class Refs {
  private cache = new Map<string, Map<string, number>>();

  constructor(
    private prisma: PrismaClient,
    readonly editionId: number,
  ) {}

  private static SHARED = new Set(['abilityScore', 'skill', 'alignment', 'damageType', 'magicSchool', 'creatureType', 'creatureSubtype', 'terrain']);

  private async load(model: string): Promise<Map<string, number>> {
    let map = this.cache.get(model);
    if (!map) {
      const where = Refs.SHARED.has(model) ? {} : { editionId: this.editionId };
      const rows: { id: number; index: string }[] = await (this.prisma as any)[model].findMany({ where, select: { id: true, index: true } });
      map = new Map(rows.map((row) => [row.index, row.id]));
      this.cache.set(model, map);
    }
    return map;
  }

  async id(model: string, index: string): Promise<number> {
    const id = (await this.load(model)).get(index);
    if (id === undefined) throw new Error(`Référence introuvable : ${model} "${index}"`);
    return id;
  }

  // Charge les index de ces modèles hors transaction : les résolutions faites
  // ensuite dans une transaction ne lisent plus la base (une seconde connexion
  // ouverte pendant une transaction peut attendre qu'elle se termine).
  async preload(...models: string[]): Promise<void> {
    for (const model of models) await this.load(model);
  }

  // Enregistre une ligne créée dans une transaction pas encore validée (invisible
  // pour les lectures faites hors de cette transaction).
  async remember(model: string, index: string, id: number): Promise<void> {
    (await this.load(model)).set(index, id);
  }

  // Invalide le cache après l'import d'un domaine (nouveaux index disponibles).
  reset(model?: string): void {
    if (model) this.cache.delete(model);
    else this.cache.clear();
  }
}

// Type de ressource d'une URL du SRD → modèle Prisma et colonne de ChoiceOptionItem
export const URL_TARGETS: Record<string, { model: string; itemField: string }> = {
  proficiencies: { model: 'proficiency', itemField: 'proficiencyId' },
  equipment: { model: 'equipment', itemField: 'equipmentId' },
  'equipment-categories': { model: 'equipmentCategory', itemField: 'equipmentCategoryId' },
  features: { model: 'classFeature', itemField: 'classFeatureId' },
  languages: { model: 'language', itemField: 'languageId' },
  spells: { model: 'spell', itemField: 'spellId' },
  traits: { model: 'trait', itemField: 'traitId' },
  'ability-scores': { model: 'abilityScore', itemField: 'abilityScoreId' },
};

export function log(message: string): void {
  console.log(`[seed] ${message}`);
}

// --- Fichiers custom ------------------------------------------------------------

export interface MergedFile extends SrdFile {
  // Entrée présente uniquement dans le fichier custom : importée comme contenu maison
  isHomebrew(index: string): boolean;
}

// Fusionne un fichier SRD et son équivalent custom (même priorité que l'ancien
// dataLoader du front) : dans la langue du fichier custom, l'entrée custom
// remplace celle du SRD ; les entrées absentes du SRD sont ajoutées à la liste.
export function loadMerged(edition: string, name: string, customFile: string, customLocale: LocaleCode): MergedFile {
  const srd = loadSrd(edition, name);
  const custom: Json[] = readJson(path.join(edition, 'custom', customFile));
  const customByIndex = new Map(custom.map((row) => [row.index as string, row]));
  const srdIndexes = new Set(srd.list.map((row) => row.index as string));
  return {
    list: [...srd.list, ...custom.filter((row) => !srdIndexes.has(row.index))],
    get: (locale, index) =>
      locale === customLocale && customByIndex.has(index) ? customByIndex.get(index) : srdIndexes.has(index) ? srd.get(locale, index) : undefined,
    isHomebrew: (index) => !srdIndexes.has(index),
  };
}
