// Historiques et dons. Les 12 historiques de custom-backgrounds.json (en
// anglais) sont importés comme contenu maison ; les objets qu'ils citent et qui
// n'existent pas dans le SRD ("lettre d'un admirateur"…) sont créés comme
// équipement maison.
import { PersonalityKind, PrismaClient } from '@prisma/client';
import { Json, loadMerged, loadSrd, log, MergedFile, parseUrl, Refs, replaceTranslations, text, translationsFor, TX_OPTIONS } from '../context';
import { ChoiceImporter } from './choices';

// Option set ({ from: { options } }) ou simple liste ([{ string }]) selon la source
function personalityTexts(value: Json): { text: string; alignments: string[] }[] {
  const options: Json[] = Array.isArray(value) ? value : value?.from?.options ?? [];
  return options.map((o) => ({ text: o.desc ?? o.string, alignments: (o.alignments ?? []).map((a: Json) => a.index) }));
}

const PERSONALITY: [PersonalityKind, string][] = [
  ['PERSONALITY_TRAIT', 'personality_traits'],
  ['IDEAL', 'ideals'],
  ['BOND', 'bonds'],
  ['FLAW', 'flaws'],
];

// Objets cités par les historiques mais absents du SRD → équipement maison
async function createMissingEquipment(prisma: PrismaClient, refs: Refs, backgrounds: MergedFile): Promise<number> {
  const known = new Set((await prisma.equipment.findMany({ where: { editionId: refs.editionId }, select: { index: true } })).map((e) => e.index));
  const missing = new Map<string, string>();
  const walk = (node: Json): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.url === 'string' && parseUrl(node.url)[0] === 'equipment' && !known.has(node.index)) missing.set(node.index, node.name);
    Object.values(node).forEach(walk);
  };
  for (const b of backgrounds.list) walk([b.starting_equipment, b.starting_equipment_options]);
  for (const [index, name] of missing) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.equipment.upsert({
        where: { editionId_index: { editionId: refs.editionId, index } },
        create: { editionId: refs.editionId, index, kind: 'ADVENTURING_GEAR', source: 'HOMEBREW' },
        update: {},
      });
      await replaceTranslations(tx, 'equipmentTranslation', 'equipmentId', row.id, [{ localeCode: 'en', data: { name, description: null } }]);
    }, TX_OPTIONS);
  }
  refs.reset('equipment');
  return missing.size;
}

export async function importBackgrounds(prisma: PrismaClient, refs: Refs, edition: string): Promise<{ untranslatedChoices: number }> {
  const { editionId } = refs;
  const key = (index: string) => ({ editionId_index: { editionId, index } });
  const choices = new ChoiceImporter(refs);
  const backgrounds = loadMerged(edition, 'Backgrounds', 'custom-backgrounds.json', 'en');

  const created = await createMissingEquipment(prisma, refs, backgrounds);
  await refs.preload('proficiency', 'equipment', 'equipmentCategory', 'language', 'alignment', 'abilityScore');

  for (const en of backgrounds.list) {
    const data = { source: backgrounds.isHomebrew(en.index) ? ('HOMEBREW' as const) : ('SRD' as const) };
    await prisma.$transaction(async (tx) => {
      const row = await tx.background.upsert({ where: key(en.index), create: { editionId, index: en.index, ...data }, update: data });
      const backgroundId = row.id;
      await replaceTranslations(tx, 'backgroundTranslation', 'backgroundId', backgroundId,
        translationsFor(backgrounds, en.index, (r) => ({ name: r.name, featureName: r.feature?.name ?? null, featureDescription: text(r.feature?.desc) })));

      await tx.backgroundProficiency.deleteMany({ where: { backgroundId } });
      await tx.backgroundProficiency.createMany({
        data: await Promise.all((en.starting_proficiencies ?? []).map(async (p: Json) => ({ backgroundId, proficiencyId: await refs.id('proficiency', p.index) }))),
        skipDuplicates: true,
      });

      // Un même objet peut être listé deux fois (héros du peuple) : quantités cumulées
      const equipment = new Map<string, number>();
      for (const e of en.starting_equipment ?? []) equipment.set(e.equipment.index, (equipment.get(e.equipment.index) ?? 0) + e.quantity);
      await tx.backgroundStartingEquipment.deleteMany({ where: { backgroundId } });
      await tx.backgroundStartingEquipment.createMany({
        data: await Promise.all([...equipment].map(async ([index, quantity]) => ({ backgroundId, equipmentId: await refs.id('equipment', index), quantity }))),
      });

      await tx.choice.deleteMany({ where: { backgroundId } });
      if (en.language_options) {
        await choices.create(tx, { backgroundId }, 'LANGUAGE', en.language_options, { fr: backgrounds.get('fr', en.index)?.language_options });
      }
      for (const [i, set] of (en.starting_equipment_options ?? []).entries()) {
        await choices.create(tx, { backgroundId }, 'STARTING_EQUIPMENT', set, { fr: backgrounds.get('fr', en.index)?.starting_equipment_options?.[i] });
      }

      // Tables de personnalité (une ligne par entrée, traductions par position)
      await tx.backgroundPersonalityOption.deleteMany({ where: { backgroundId } });
      for (const [kind, field] of PERSONALITY) {
        const enTexts = personalityTexts(en[field]);
        const frTexts = personalityTexts(backgrounds.get('fr', en.index)?.[field]);
        for (const [i, entry] of enTexts.entries()) {
          const option = await tx.backgroundPersonalityOption.create({ data: { backgroundId, kind, position: i + 1 } });
          const rows = [{ optionId: option.id, localeCode: 'en', text: entry.text }];
          const fr = frTexts[i]?.text;
          if (fr && fr !== entry.text) rows.push({ optionId: option.id, localeCode: 'fr', text: fr });
          await tx.personalityOptionTranslation.createMany({ data: rows });
          if (entry.alignments.length) {
            await tx.personalityOptionAlignment.createMany({
              data: await Promise.all(entry.alignments.map(async (a) => ({ optionId: option.id, alignmentId: await refs.id('alignment', a) }))),
            });
          }
        }
      }
    }, TX_OPTIONS);
  }

  // --- Dons ---
  const feats = loadSrd(edition, 'Feats');
  for (const en of feats.list) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.feat.upsert({ where: key(en.index), create: { editionId, index: en.index }, update: {} });
      await replaceTranslations(tx, 'featTranslation', 'featId', row.id,
        translationsFor(feats, en.index, (r) => ({ name: r.name, description: text(r.desc) ?? '' })));
      await tx.featPrerequisite.deleteMany({ where: { featId: row.id } });
      await tx.featPrerequisite.createMany({
        data: await Promise.all((en.prerequisites ?? []).map(async (p: Json, i: number) => ({
          featId: row.id, abilityScoreId: await refs.id('abilityScore', p.ability_score.index), minimumScore: p.minimum_score, alternativeGroup: i + 1,
        }))),
      });
    }, TX_OPTIONS);
  }

  const homebrew = backgrounds.list.filter((b) => backgrounds.isHomebrew(b.index)).length;
  log(`historiques : ${backgrounds.list.length} (${homebrew} maison), ${created} objets maison créés ; dons : ${feats.list.length}`);
  return { untranslatedChoices: choices.untranslated };
}
