// Présentation dans le créateur (custom/presentation.json) : accroches,
// icônes, difficulté et caractéristiques recommandées des classes, races,
// historiques, sous-classes et caractéristiques.
//
// Lancé après les classes, races et historiques : leurs importeurs remplacent
// les traductions, ce qui efface les accroches.
import { ClassDifficulty, PrismaClient } from '@prisma/client';
import { Json, log, readJson, Refs, TX_OPTIONS } from '../context';

type Summary = Record<string, string>;
interface PresentationFile {
  classes: Record<string, { difficulty: ClassDifficulty; recommended: string[]; summary: Summary }>;
  races: Record<string, { icon: string; summary: Summary }>;
  backgrounds: Record<string, { icon: string; summary: Summary }>;
  subclasses: Record<string, string>;
  abilityScores: Record<string, Summary>;
}

export async function importPresentation(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const file: PresentationFile = readJson(`${edition}/custom/presentation.json`);
  const { editionId } = refs;
  const key = (index: string) => ({ editionId_index: { editionId, index } });
  const abilities = new Map((await prisma.abilityScore.findMany({ select: { id: true, index: true } })).map((a) => [a.index, a.id]));
  let count = 0;

  await prisma.$transaction(async (tx) => {
    for (const [index, c] of Object.entries(file.classes)) {
      const row = await tx.class.findUnique({ where: key(index), select: { id: true } });
      if (!row) continue;
      await tx.class.update({ where: { id: row.id }, data: { difficulty: c.difficulty } });
      await tx.classRecommendedAbility.deleteMany({ where: { classId: row.id } });
      await tx.classRecommendedAbility.createMany({
        data: c.recommended.map((a, position) => ({ classId: row.id, abilityScoreId: abilities.get(a)!, position })),
      });
      for (const [localeCode, summary] of Object.entries(c.summary)) {
        await tx.classTranslation.updateMany({ where: { classId: row.id, localeCode }, data: { summary } });
      }
      count++;
    }
    for (const [index, r] of Object.entries(file.races)) {
      const row = await tx.race.findUnique({ where: key(index), select: { id: true } });
      if (!row) continue;
      await tx.race.update({ where: { id: row.id }, data: { icon: r.icon } });
      for (const [localeCode, summary] of Object.entries(r.summary)) {
        await tx.raceTranslation.updateMany({ where: { raceId: row.id, localeCode }, data: { summary } });
      }
      count++;
    }
    for (const [index, b] of Object.entries(file.backgrounds)) {
      const row = await tx.background.findUnique({ where: key(index), select: { id: true } });
      if (!row) continue;
      await tx.background.update({ where: { id: row.id }, data: { icon: b.icon } });
      for (const [localeCode, summary] of Object.entries(b.summary)) {
        await tx.backgroundTranslation.updateMany({ where: { backgroundId: row.id, localeCode }, data: { summary } });
      }
      count++;
    }
    for (const [index, icon] of Object.entries(file.subclasses)) {
      count += (await tx.subclass.updateMany({ where: { editionId, index }, data: { icon } })).count;
    }
    for (const [index, summaries] of Object.entries(file.abilityScores)) {
      for (const [localeCode, summary] of Object.entries(summaries as Json)) {
        await tx.abilityScoreTranslation.updateMany({ where: { abilityScoreId: abilities.get(index), localeCode }, data: { summary: summary as string } });
      }
    }
  }, TX_OPTIONS);
  log(`présentation : ${count} classes, races, historiques et sous-classes`);
}
