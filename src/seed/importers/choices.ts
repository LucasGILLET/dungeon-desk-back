// Conversion des "option sets" récursifs du SRD vers Choice / ChoiceOption /
// ChoiceOptionItem. Utilisé par les classes, les races, les traits et les historiques.
import { ChoiceKind, ChoicePool } from '@prisma/client';
import { Json, LocaleCode, parseUrl, Refs, Tx, URL_TARGETS } from '../context';

// Propriétaire du choix : { classId }, { classFeatureId }, { raceId }, { traitId }, { backgroundId }…
export type ChoiceOwner = Record<string, number>;

// Un choix à écrire : option set anglais et ses équivalents par langue
export interface ChoiceSpec {
  kind: ChoiceKind;
  set: Json;
  localized: Partial<Record<LocaleCode, Json>>;
}

// Les options "string" du rôdeur sont des pluriels anglais
const CREATURE_TYPE_STRINGS: Record<string, string> = {
  aberrations: 'aberration', beasts: 'beast', celestials: 'celestial', constructs: 'construct', dragons: 'dragon',
  elementals: 'elemental', fey: 'fey', fiends: 'fiend', giants: 'giant', monstrosities: 'monstrosity', oozes: 'ooze',
  plants: 'plant', undead: 'undead', humanoids: 'humanoid',
};

// Pièces de monnaie référencées par les historiques ("/api/2014/currency/gold-piece")
const CURRENCIES: Record<string, string> = {
  'copper-piece': 'CP', 'silver-piece': 'SP', 'electrum-piece': 'EP', 'gold-piece': 'GP', 'platinum-piece': 'PP',
};

// Description par défaut quand le SRD n'en fournit pas (bonus raciaux, sorts…)
const DEFAULT_DESCRIPTIONS: Partial<Record<ChoiceKind, { en: (n: number) => string; fr: (n: number) => string }>> = {
  ABILITY_SCORE_INCREASE: { en: (n) => `Increase ${n} ability scores of your choice`, fr: (n) => `Augmentez ${n} caractéristiques de votre choix` },
  LANGUAGE: { en: (n) => `Choose ${n} language${n > 1 ? 's' : ''}`, fr: (n) => `Choisissez ${n} langue${n > 1 ? 's' : ''}` },
  SPELL: { en: (n) => `Choose ${n} spell${n > 1 ? 's' : ''}`, fr: (n) => `Choisissez ${n} sort${n > 1 ? 's' : ''}` },
  SUBFEATURE: { en: (n) => `Choose ${n} option${n > 1 ? 's' : ''}`, fr: (n) => `Choisissez ${n} option${n > 1 ? 's' : ''}` },
};

interface ItemData {
  quantity?: number;
  [field: string]: unknown;
}

export class ChoiceImporter {
  // Descriptions de choix identiques à l'anglais dans le fichier français : non
  // traduites, on laisse l'API se rabattre sur l'anglais.
  untranslated = 0;

  constructor(private refs: Refs) {}

  private async reference(url: string): Promise<ItemData> {
    const [kind, index] = parseUrl(url);
    if (kind === 'currency') {
      if (!CURRENCIES[index]) throw new Error(`Monnaie inconnue : ${url}`);
      return { currency: CURRENCIES[index], currencyAmount: 1 };
    }
    const target = URL_TARGETS[kind];
    if (!target) throw new Error(`Type de référence non géré dans un choix : ${url}`);
    return { [target.itemField]: await this.refs.id(target.model, index) };
  }

  private async items(option: Json, kind: ChoiceKind): Promise<ItemData[]> {
    switch (option.option_type) {
      case 'reference':
        return [await this.reference(option.item.url)];
      case 'counted_reference': {
        const ref = await this.reference(option.of.url);
        // "15 po" : la quantité d'une monnaie est son montant
        return ref.currency ? [{ ...ref, currencyAmount: Number(option.count) }] : [{ ...ref, quantity: Number(option.count) }];
      }
      case 'ability_bonus':
        return [{ abilityScoreId: await this.refs.id('abilityScore', option.ability_score.index), bonus: option.bonus }];
      case 'multiple':
        return (await Promise.all(option.items.map((sub: Json) => this.items(sub, kind)))).flat();
      case 'choice': {
        // Dans un lot : "une arme de guerre au choix" → item de catégorie
        const from = option.choice.from;
        if (from.option_set_type !== 'equipment_category') throw new Error('Sous-choix non géré à l\'intérieur d\'un lot');
        return [{ equipmentCategoryId: await this.refs.id('equipmentCategory', from.equipment_category.index), quantity: option.choice.choose }];
      }
      case 'string': {
        if (kind === 'FAVORED_ENEMY') return [{ creatureTypeId: await this.refs.id('creatureType', CREATURE_TYPE_STRINGS[option.string ?? option] ?? option) }];
        if (kind === 'FAVORED_TERRAIN') return [{ terrainId: await this.refs.id('terrain', option.string ?? option) }];
        throw new Error(`Option texte non gérée pour un choix ${kind}`);
      }
      default:
        throw new Error(`Type d'option non géré : ${option.option_type}`);
    }
  }

  // Les options "string" du SRD sont parfois de simples chaînes au lieu d'objets
  private normalize(option: Json): Json {
    return typeof option === 'string' ? { option_type: 'string', string: option } : option;
  }

  // Met les choix d'un propriétaire en conformité avec les option sets donnés.
  // Les choix et options existants sont réutilisés par position (mêmes id),
  // car des personnages les référencent ; seuls ceux en trop sont supprimés,
  // ce qui échoue (Restrict) si un personnage les a choisis.
  async sync(tx: Tx, owner: ChoiceOwner, specs: ChoiceSpec[]): Promise<number[]> {
    const existing = await tx.choice.findMany({ where: owner, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true } });
    const ids: number[] = [];
    for (const [position, spec] of specs.entries()) ids.push(await this.write(tx, owner, position, existing[position]?.id, spec));
    const stale = existing.slice(specs.length).map((c) => c.id);
    if (stale.length) await tx.choice.deleteMany({ where: { id: { in: stale } } });
    return ids;
  }

  // Écrit un choix (et ses sous-choix) à partir d'un option set anglais et de ses
  // équivalents dans les autres langues (même structure, mêmes positions).
  private async write(tx: Tx, owner: ChoiceOwner, position: number, existingId: number | undefined, spec: ChoiceSpec): Promise<number> {
    const { kind, set, localized } = spec;
    const from = set.from;
    const pool: { pool: ChoicePool | null; poolCategoryId: number | null } = { pool: null, poolCategoryId: null };
    if (from.option_set_type === 'equipment_category') {
      pool.pool = 'EQUIPMENT_CATEGORY';
      pool.poolCategoryId = await this.refs.id('equipmentCategory', from.equipment_category.index);
    } else if (from.option_set_type === 'resource_list') {
      if (!from.resource_list_url.endsWith('/languages')) throw new Error(`Liste de ressources non gérée : ${from.resource_list_url}`);
      pool.pool = 'ANY_LANGUAGE';
    } else if (from.option_set_type !== 'options_array') {
      throw new Error(`Type d'option set non géré : ${from.option_set_type}`);
    }

    const data = { kind, choose: set.choose, position, ...pool };
    const choice = existingId
      ? await tx.choice.update({ where: { id: existingId }, data })
      : await tx.choice.create({ data: { ...data, ...owner } });

    const fallback = DEFAULT_DESCRIPTIONS[kind];
    const enDesc: string = set.desc ?? fallback?.en(set.choose) ?? set.type;
    const translations = [{ choiceId: choice.id, localeCode: 'en', description: enDesc }];
    if (!set.desc && fallback) translations.push({ choiceId: choice.id, localeCode: 'fr', description: fallback.fr(set.choose) });
    for (const [localeCode, other] of Object.entries(localized)) {
      if (!other?.desc || translations.some((t) => t.localeCode === localeCode)) continue;
      if (other.desc === enDesc) this.untranslated++;
      else translations.push({ choiceId: choice.id, localeCode, description: other.desc });
    }
    await tx.choiceTranslation.deleteMany({ where: { choiceId: choice.id } });
    await tx.choiceTranslation.createMany({ data: translations });

    const options: Json[] = from.option_set_type === 'options_array' ? from.options : [];
    const existingOptions = await tx.choiceOption.findMany({ where: { choiceId: choice.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true } });
    for (const [position, raw] of options.entries()) {
      const option = this.normalize(raw);
      const optionId = existingOptions[position]
        ? (await tx.choiceOption.update({ where: { id: existingOptions[position].id }, data: { position } })).id
        : (await tx.choiceOption.create({ data: { choiceId: choice.id, position } })).id;
      await tx.choiceOptionItem.deleteMany({ where: { optionId } });
      const nestedOwner = { parentOptionId: optionId };
      if (option.option_type === 'choice') {
        const sub = Object.fromEntries(
          Object.entries(localized).map(([locale, other]) => [locale, other?.from?.options?.[position]?.choice]),
        );
        await this.sync(tx, nestedOwner, [{ kind, set: option.choice, localized: sub }]);
        continue;
      }
      // Lot contenant un sous-choix non lié à une catégorie : "une compétence au
      // choix + les outils de voleur" → items + un sous-choix rattaché à l'option
      let parts = option;
      const nestedSpecs: ChoiceSpec[] = [];
      if (option.option_type === 'multiple') {
        const isNested = (sub: Json) => sub.option_type === 'choice' && sub.choice.from.option_set_type !== 'equipment_category';
        const nested = option.items.filter(isNested);
        if (nested.length > 1) throw new Error('Plusieurs sous-choix dans un même lot : non géré');
        if (nested.length) {
          const index = option.items.indexOf(nested[0]);
          const sub = Object.fromEntries(
            Object.entries(localized).map(([locale, other]) => [locale, other?.from?.options?.[position]?.items?.[index]?.choice]),
          );
          nestedSpecs.push({ kind, set: nested[0].choice, localized: sub });
        }
        parts = { ...option, items: option.items.filter((sub: Json) => !isNested(sub)) };
      }
      await this.sync(tx, nestedOwner, nestedSpecs);
      const items = await this.items(parts, kind);
      await tx.choiceOptionItem.createMany({ data: items.map((item) => ({ optionId, ...item })) });
    }
    const staleOptions = existingOptions.slice(options.length).map((o) => o.id);
    if (staleOptions.length) await tx.choiceOption.deleteMany({ where: { id: { in: staleOptions } } });
    return choice.id;
  }
}
