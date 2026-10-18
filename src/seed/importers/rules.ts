// Règles du SRD : chapitres (5e-SRD-Rules) et sections (5e-SRD-Rule-Sections),
// texte Markdown traduit. L'ordre des sections est celui de leur chapitre.
import { PrismaClient } from '@prisma/client';
import { Json, loadSrd, log, Refs, replaceTranslations, text, translationsFor, TX_OPTIONS } from '../context';

export async function importRules(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const chapters = loadSrd(edition, 'Rules');
  const sections = loadSrd(edition, 'Rule-Sections');
  for (const [position, en] of (chapters.list as Json[]).entries()) {
    await prisma.$transaction(async (tx) => {
      const chapter = await tx.ruleChapter.upsert({
        where: { editionId_index: { editionId, index: en.index } },
        create: { editionId, index: en.index, position },
        update: { position },
      });
      await replaceTranslations(tx, 'ruleChapterTranslation', 'ruleChapterId', chapter.id,
        translationsFor(chapters, en.index, (r) => ({ name: r.name, description: text(r.desc) })));
      for (const [p, sub] of (en.subsections as Json[]).entries()) {
        if (!sections.get('en', sub.index)) throw new Error(`Section de règles introuvable : ${sub.index}`);
        const row = await tx.ruleSection.upsert({
          where: { editionId_index: { editionId, index: sub.index } },
          create: { editionId, index: sub.index, chapterId: chapter.id, position: p },
          update: { chapterId: chapter.id, position: p },
        });
        await replaceTranslations(tx, 'ruleSectionTranslation', 'ruleSectionId', row.id,
          translationsFor(sections, sub.index, (r) => ({ name: r.name, description: text(r.desc) ?? '' })));
      }
    }, TX_OPTIONS);
  }
  refs.reset('ruleSection');
  log(`règles : ${chapters.list.length} chapitres, ${sections.list.length} sections`);
}
