// Référentiels : caractéristiques, compétences, alignements, types de dégâts,
// écoles de magie, types de créatures, terrains (partagés) ; états et langues
// (rattachés à l'édition).
import { AlignmentEthic, AlignmentMorality, LanguageRarity, PrismaClient } from '@prisma/client';
import { Json, loadSrd, log, readJson, Refs, replaceTranslations, SrdFile, text, translationsFor, TX_OPTIONS, Tx } from '../context';

// Upsert générique d'une entrée + remplacement de ses traductions.
async function upsertWithTranslations(
  tx: Tx,
  model: string,
  key: { index: string; editionId?: number },
  data: Record<string, unknown>,
  translationModel: string,
  foreignKey: string,
  translations: { localeCode: string; data: Record<string, unknown> }[],
): Promise<number> {
  // Clé métier : index seul (référentiels partagés) ou [editionId, index]
  const where = key.editionId === undefined ? { index: key.index } : { editionId_index: key };
  const row = await (tx as any)[model].upsert({ where, create: { ...key, ...data }, update: data });
  await replaceTranslations(tx, translationModel, foreignKey, row.id, translations);
  return row.id;
}

async function each(prisma: PrismaClient, file: SrdFile, fn: (tx: Tx, en: Json) => Promise<unknown>): Promise<number> {
  for (const en of file.list) {
    await prisma.$transaction((tx) => fn(tx, en) as Promise<unknown>, TX_OPTIONS);
  }
  return file.list.length;
}

export async function importReferentiels(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const abilities = loadSrd(edition, 'Ability-Scores');
  const order = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  await each(prisma, abilities, (tx, en) =>
    upsertWithTranslations(tx, 'abilityScore', { index: en.index }, { position: order.indexOf(en.index) + 1 },
      'abilityScoreTranslation', 'abilityScoreId',
      translationsFor(abilities, en.index, (row) => ({ abbreviation: row.name, name: row.full_name, description: text(row.desc) }))),
  );
  refs.reset('abilityScore');

  const skills = loadSrd(edition, 'Skills');
  await refs.preload('abilityScore');
  for (const en of skills.list) {
    const abilityScoreId = await refs.id('abilityScore', en.ability_score.index);
    await prisma.$transaction((tx) =>
      upsertWithTranslations(tx, 'skill', { index: en.index }, { abilityScoreId },
        'skillTranslation', 'skillId',
        translationsFor(skills, en.index, (row) => ({ name: row.name, description: text(row.desc) }))), TX_OPTIONS);
  }

  const alignments = loadSrd(edition, 'Alignments');
  await each(prisma, alignments, (tx, en) => {
    const [ethic, morality] = en.index === 'neutral' ? ['neutral', 'neutral'] : en.index.split('-');
    return upsertWithTranslations(tx, 'alignment', { index: en.index },
      { ethic: ethic.toUpperCase() as AlignmentEthic, morality: morality.toUpperCase() as AlignmentMorality },
      'alignmentTranslation', 'alignmentId',
      translationsFor(alignments, en.index, (row) => ({ name: row.name, abbreviation: row.abbreviation, description: text(row.desc) })));
  });

  for (const [name, model] of [['Damage-Types', 'damageType'], ['Magic-Schools', 'magicSchool']] as const) {
    const file = loadSrd(edition, name);
    await each(prisma, file, (tx, en) =>
      upsertWithTranslations(tx, model, { index: en.index }, {}, `${model}Translation`, `${model}Id`,
        translationsFor(file, en.index, (row) => ({ name: row.name, description: text(row.desc) }))));
  }

  // Types de créatures et terrains : absents du SRD sous forme de fichiers
  const labels = readJson(`${edition}/custom/class-labels.json`);
  for (const [index, names] of Object.entries<Record<string, [string, string]>>(labels.creatureTypes)) {
    await prisma.$transaction((tx) =>
      upsertWithTranslations(tx, 'creatureType', { index }, {}, 'creatureTypeTranslation', 'creatureTypeId',
        Object.entries(names).map(([localeCode, [name, pluralName]]) => ({ localeCode, data: { name, pluralName } }))), TX_OPTIONS);
  }
  for (const [index, names] of Object.entries<Record<string, string>>(labels.terrains)) {
    await prisma.$transaction((tx) =>
      upsertWithTranslations(tx, 'terrain', { index }, {}, 'terrainTranslation', 'terrainId',
        Object.entries(names).map(([localeCode, name]) => ({ localeCode, data: { name } }))), TX_OPTIONS);
  }

  // --- Rattachés à l'édition ---
  const conditions = loadSrd(edition, 'Conditions');
  await each(prisma, conditions, (tx, en) =>
    upsertWithTranslations(tx, 'condition', { editionId: refs.editionId, index: en.index }, {},
      'conditionTranslation', 'conditionId',
      translationsFor(conditions, en.index, (row) => ({ name: row.name, description: text(row.desc) ?? '' }))).then(() => undefined),
  );

  // Langues : l'alphabet est désigné par le nom anglais d'une autre langue
  const languages = loadSrd(edition, 'Languages');
  const ids = new Map<string, number>();
  for (const en of languages.list) {
    const data = { rarity: en.type.toUpperCase() as LanguageRarity };
    const id = await prisma.$transaction((tx) =>
      upsertWithTranslations(tx, 'language', { editionId: refs.editionId, index: en.index }, data, 'languageTranslation', 'languageId',
        translationsFor(languages, en.index, (row) => ({
          name: row.name,
          typicalSpeakers: row.typical_speakers?.length ? row.typical_speakers.join(', ') : null,
          description: text(row.desc),
        }))), TX_OPTIONS);
    ids.set(en.name, id);
  }
  for (const en of languages.list) {
    const scriptId = en.script ? ids.get(en.script) ?? null : null;
    await prisma.language.update({ where: { id: ids.get(en.name)! }, data: { scriptId } });
  }
  refs.reset();

  log(`référentiels : ${abilities.list.length} caractéristiques, ${skills.list.length} compétences, ${alignments.list.length} alignements, ` +
    `${conditions.list.length} états, ${languages.list.length} langues, ${Object.keys(labels.creatureTypes).length} types de créatures`);
}
