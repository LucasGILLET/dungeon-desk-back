// Races, sous-races et traits. Les fichiers custom (sous-races et traits en
// français) priment sur le SRD dans leur langue ; leurs entrées absentes du SRD
// (elfe des bois, halfelin robuste…) deviennent du contenu maison.
import { Prisma, PrismaClient } from '@prisma/client';
import { SizesSchema, SpeedsSchema, TraitActionSchema } from '../../srd/jsonb';
import { Json, loadMerged, loadSrd, log, MergedFile, Refs, replaceTranslations, SrdFile, text, translationsFor, TX_OPTIONS, Tx } from '../context';
import { ChoiceImporter, ChoiceSpec } from './choices';
import { parseActivation } from '../activation';

const localized = (file: SrdFile, index: string, pick: (row: Json) => Json) => {
  const fr = file.get('fr', index);
  return { fr: fr ? pick(fr) : undefined };
};

// Souffle du drakéide → JSONB TraitAction
function traitAction(specific: Json): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const breath = specific?.breath_weapon;
  if (!breath) return Prisma.DbNull;
  const usage = breath.usage?.type === 'per rest' ? { type: 'per_short_rest', times: breath.usage.times } : undefined;
  return TraitActionSchema.parse({
    area: breath.area_of_effect ? { type: breath.area_of_effect.type, sizeFt: breath.area_of_effect.size } : undefined,
    save: breath.dc ? { abilityIndex: breath.dc.dc_type.index, success: breath.dc.success_type } : undefined,
    damageAtCharacterLevel: breath.damage?.[0]?.damage_at_character_level,
    usage,
  });
}

// Sorts accordés par les traits : le SRD ne les donne qu'en texte
type TraitSpellSpec = { spell: string; level?: number; castAt?: number; longRest?: boolean };
export const TRAIT_SPELLS: Record<string, { ability: string; spells: TraitSpellSpec[] }> = {
  'infernal-legacy': { ability: 'cha', spells: [{ spell: 'thaumaturgy' }, { spell: 'hellish-rebuke', level: 3, castAt: 2, longRest: true }, { spell: 'darkness', level: 5, longRest: true }] },
  'drow-magic': { ability: 'cha', spells: [{ spell: 'dancing-lights' }, { spell: 'faerie-fire', level: 3, longRest: true }, { spell: 'darkness', level: 5, longRest: true }] },
  'natural-illusionist': { ability: 'int', spells: [{ spell: 'minor-illusion' }] },
  // Sort mineur au choix (choix SPELL du trait) : seulement la caractéristique
  'high-elf-cantrip': { ability: 'int', spells: [] },
};

// « You have resistance to fire damage », « resistance against poison damage » ;
// l'ascendance draconique donne la résistance au type de dégâts du dragon
export function parseResistances(en: Json): string[] {
  const found = [...text(en.desc ?? [])?.matchAll(/resistance (?:to|against) (?!the )(\w+) damage/g) ?? []].map((m) => m[1]!.toLowerCase());
  if (en.parent?.index === 'draconic-ancestry' && en.trait_specific?.damage_type) found.push(en.trait_specific.damage_type.index);
  return [...new Set(found)];
}

export async function importRaces(prisma: PrismaClient, refs: Refs, edition: string): Promise<{ untranslatedChoices: number }> {
  const { editionId } = refs;
  const key = (index: string) => ({ editionId_index: { editionId, index } });
  const choices = new ChoiceImporter(refs);
  await refs.preload('abilityScore', 'proficiency', 'language', 'spell', 'damageType', 'trait');

  // --- Traits (avant les races et sous-races qui les référencent) ---
  const traits: MergedFile = loadMerged(edition, 'Traits', 'custom-traits.json', 'fr');
  const traitIds = new Map<string, number>();
  for (const en of traits.list) {
    const specific = en.trait_specific ?? {};
    const data = {
      damageTypeId: specific.damage_type ? await refs.id('damageType', specific.damage_type.index) : null,
      spellAbilityId: TRAIT_SPELLS[en.index] ? await refs.id('abilityScore', TRAIT_SPELLS[en.index]!.ability) : null,
      activation: parseActivation(en.index, text(en.desc) ?? ''),
      action: traitAction(specific),
      source: traits.isHomebrew(en.index) ? ('HOMEBREW' as const) : ('SRD' as const),
    };
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.trait.upsert({ where: key(en.index), create: { editionId, index: en.index, ...data }, update: data });
      await replaceTranslations(tx, 'traitTranslation', 'traitId', row.id,
        translationsFor(traits, en.index, (r) => ({ name: r.name, description: text(r.desc) ?? '' })));
      return row.id;
    }, TX_OPTIONS);
    traitIds.set(en.index, id);
    await refs.remember('trait', en.index, id);
  }
  // Parents, maîtrises et choix, une fois tous les traits créés
  for (const en of traits.list) {
    const traitId = traitIds.get(en.index)!;
    await prisma.$transaction(async (tx) => {
      await tx.trait.update({ where: { id: traitId }, data: { parentId: en.parent ? traitIds.get(en.parent.index) ?? null : null } });
      await tx.traitSpell.deleteMany({ where: { traitId } });
      await tx.traitSpell.createMany({
        data: await Promise.all((TRAIT_SPELLS[en.index]?.spells ?? []).map(async (sp) => ({
          traitId, spellId: await refs.id('spell', sp.spell), requiredCharacterLevel: sp.level ?? 1, castAtLevel: sp.castAt ?? null, oncePerLongRest: !!sp.longRest,
        }))),
      });
      await tx.traitDamageResistance.deleteMany({ where: { traitId } });
      await tx.traitDamageResistance.createMany({
        data: await Promise.all(parseResistances(en).map(async (d) => ({ traitId, damageTypeId: await refs.id('damageType', d) }))),
      });
      await tx.traitProficiency.deleteMany({ where: { traitId } });
      await tx.traitProficiency.createMany({
        data: await Promise.all((en.proficiencies ?? []).map(async (p: Json) => ({ traitId, proficiencyId: await refs.id('proficiency', p.index) }))),
        skipDuplicates: true,
      });
      const specific = en.trait_specific ?? {};
      const sets: [Json, ChoiceSpec['kind'], (r: Json) => Json][] = [
        [en.proficiency_choices, 'PROFICIENCY', (r) => r.proficiency_choices],
        [en.language_options, 'LANGUAGE', (r) => r.language_options],
        [specific.spell_options, 'SPELL', (r) => r.trait_specific?.spell_options],
        [specific.subtrait_options, 'SUBFEATURE', (r) => r.trait_specific?.subtrait_options],
      ];
      await choices.sync(tx, { traitId }, sets.filter(([set]) => set)
        .map(([set, kind, pick]) => ({ kind, set, localized: localized(traits, en.index, pick) })));
    }, TX_OPTIONS);
  }

  // --- Races ---
  const races = loadSrd(edition, 'Races');
  const raceIds = new Map<string, number>();
  for (const en of races.list) {
    const data = { sizes: SizesSchema.parse([en.size.toUpperCase()]), speeds: SpeedsSchema.parse({ walk: en.speed }) };
    const raceId = await prisma.$transaction(async (tx: Tx) => {
      const row = await tx.race.upsert({ where: key(en.index), create: { editionId, index: en.index, ...data }, update: data });
      const raceId = row.id;
      await replaceTranslations(tx, 'raceTranslation', 'raceId', raceId,
        translationsFor(races, en.index, (r) => ({
          name: r.name, ageText: r.age ?? null, alignmentText: r.alignment ?? null, sizeText: r.size_description ?? null, languageText: r.language_desc ?? null,
        })));
      await tx.raceAbilityBonus.deleteMany({ where: { raceId } });
      await tx.raceAbilityBonus.createMany({
        data: await Promise.all(en.ability_bonuses.map(async (b: Json) => ({ raceId, abilityScoreId: await refs.id('abilityScore', b.ability_score.index), bonus: b.bonus }))),
      });
      await tx.raceLanguage.deleteMany({ where: { raceId } });
      await tx.raceLanguage.createMany({
        data: await Promise.all(en.languages.map(async (l: Json) => ({ raceId, languageId: await refs.id('language', l.index) }))),
      });
      await tx.raceTrait.deleteMany({ where: { raceId } });
      await tx.raceTrait.createMany({ data: en.traits.map((t: Json) => ({ raceId, traitId: traitIds.get(t.index)! })) });
      const raceChoices: ChoiceSpec[] = [];
      if (en.ability_bonus_options) {
        raceChoices.push({ kind: 'ABILITY_SCORE_INCREASE', set: en.ability_bonus_options, localized: localized(races, en.index, (r) => r.ability_bonus_options) });
      }
      if (en.language_options) {
        raceChoices.push({ kind: 'LANGUAGE', set: en.language_options, localized: localized(races, en.index, (r) => r.language_options) });
      }
      await choices.sync(tx, { raceId }, raceChoices);
      return raceId;
    }, TX_OPTIONS);
    raceIds.set(en.index, raceId);
  }

  // --- Sous-races (SRD + custom) ---
  const subraces: MergedFile = loadMerged(edition, 'Subraces', 'custom-subraces.json', 'fr');
  // Traits rattachés par les fichiers custom ("subraces": ["high-elf", …])
  const customLinks = new Map<string, Set<string>>();
  for (const t of traits.list) {
    for (const sub of t.subraces ?? []) {
      const index = typeof sub === 'string' ? sub : sub.index;
      if (!customLinks.has(index)) customLinks.set(index, new Set());
      customLinks.get(index)!.add(t.index);
    }
  }
  for (const en of subraces.list) {
    const data = { raceId: raceIds.get(en.race.index)!, source: subraces.isHomebrew(en.index) ? ('HOMEBREW' as const) : ('SRD' as const) };
    await prisma.$transaction(async (tx) => {
      const row = await tx.subrace.upsert({ where: key(en.index), create: { editionId, index: en.index, ...data }, update: data });
      const subraceId = row.id;
      await replaceTranslations(tx, 'subraceTranslation', 'subraceId', subraceId,
        translationsFor(subraces, en.index, (r) => ({ name: r.name, description: text(r.desc) })));
      await tx.subraceAbilityBonus.deleteMany({ where: { subraceId } });
      await tx.subraceAbilityBonus.createMany({
        data: await Promise.all((en.ability_bonuses ?? []).map(async (b: Json) => ({ subraceId, abilityScoreId: await refs.id('abilityScore', b.ability_score.index), bonus: b.bonus }))),
      });
      const linked = new Set<string>([...(en.racial_traits ?? []).map((t: Json) => t.index), ...(customLinks.get(en.index) ?? [])]);
      await tx.subraceTrait.deleteMany({ where: { subraceId } });
      await tx.subraceTrait.createMany({ data: [...linked].map((index) => ({ subraceId, traitId: traitIds.get(index)! })) });
    }, TX_OPTIONS);
  }

  const homebrew = (file: MergedFile) => file.list.filter((r) => file.isHomebrew(r.index)).length;
  log(`races : ${races.list.length} races, ${subraces.list.length} sous-races (${homebrew(subraces)} maison), ${traits.list.length} traits (${homebrew(traits)} maison)`);
  return { untranslatedChoices: choices.untranslated };
}
