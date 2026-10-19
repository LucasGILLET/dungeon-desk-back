// Guides de l'application (pages « Apprendre DnD », aide-mémoire de combat) :
// contenu éditorial de custom/guides.json. Les sections et cartes absentes du
// fichier sont supprimées, celles qui restent gardent leur id (index stable).
import { GuideAccent, PrismaClient } from '@prisma/client';
import { Json, LOCALES, log, readJson, Refs, replaceTranslations, TX_OPTIONS, Tx } from '../context';

// Traductions présentes dans l'entrée ({ fr: {...}, en: {...} }) ; champs vides → null
function translations(entry: Json, build: (t: Json) => Record<string, unknown>) {
  return LOCALES.filter((locale) => entry[locale]).map((localeCode) => ({ localeCode, data: build(entry[localeCode]) }));
}

const style = (entry: Json) => ({ icon: entry.icon ?? null, accent: (entry.accent ?? null) as GuideAccent | null });

// Les pages existantes ne sont pas réécrites : elles sont rédigées dans Directus.
// `reset` (option --reset-guides du seed) les remet au contenu du fichier.
export async function importGuides(prisma: PrismaClient, refs: Refs, edition: string, reset = false): Promise<void> {
  const { editionId } = refs;
  const { pages } = readJson(`${edition}/custom/guides.json`);
  await refs.preload('class', 'race', 'ruleSection');
  let cards = 0;
  let kept = 0;
  for (const [position, page] of (pages as Json[]).entries()) {
    if (!reset && (await prisma.guidePage.findUnique({ where: { editionId_index: { editionId, index: page.index } }, select: { id: true } }))) {
      kept += 1;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const data = { position, published: page.published ?? true, ...style(page) };
      const row = await tx.guidePage.upsert({
        where: { editionId_index: { editionId, index: page.index } },
        create: { editionId, index: page.index, ...data },
        update: data,
      });
      await replaceTranslations(tx, 'guidePageTranslation', 'guidePageId', row.id, translations(page, (t) => ({
        title: t.title, shortTitle: t.shortTitle ?? null, eyebrow: t.eyebrow ?? null, heading: t.heading ?? null, intro: t.intro ?? null,
      })));
      cards += await writeSections(tx, row.id, page.sections, refs);
    }, TX_OPTIONS);
  }
  log(`guides : ${pages.length - kept} page(s) importée(s), ${cards} cartes` + (kept ? ` ; ${kept} déjà en base, laissée(s) telle(s) quelle(s) (--reset-guides pour les réécrire)` : ''));
}

async function writeSections(tx: Tx, pageId: number, sections: Json[], refs: Refs): Promise<number> {
  await tx.guideSection.deleteMany({ where: { pageId, index: { notIn: sections.map((s) => s.index) } } });
  const ids = new Map<string, number>();
  for (const [position, section] of sections.entries()) {
    const data = { position, level: section.level ?? 1, ...style(section) };
    const row = await tx.guideSection.upsert({
      where: { pageId_index: { pageId, index: section.index } },
      create: { pageId, index: section.index, ...data },
      update: data,
    });
    ids.set(section.index, row.id);
    await replaceTranslations(tx, 'guideSectionTranslation', 'guideSectionId', row.id, translations(section, (t) => ({
      title: t.title ?? null, subtitle: t.subtitle ?? null, body: t.body ?? null,
    })));
  }

  // Cartes, une fois toutes les sections créées (renvoi vers une section de détail)
  let count = 0;
  for (const section of sections) {
    const sectionId = ids.get(section.index)!;
    const list: Json[] = section.cards ?? [];
    await tx.guideCard.deleteMany({ where: { sectionId, index: { notIn: list.map((c) => c.index) } } });
    for (const [position, card] of list.entries()) {
      if (card.detail && !ids.has(card.detail)) throw new Error(`Guide : section de détail "${card.detail}" introuvable pour la carte ${card.index}`);
      const data = {
        position,
        ...style(card),
        classId: card.class ? await refs.id('class', card.class) : null,
        raceId: card.race ? await refs.id('race', card.race) : null,
        ruleSectionId: card.rule ? await refs.id('ruleSection', card.rule) : null,
        detailSectionId: card.detail ? ids.get(card.detail)! : null,
      };
      const row = await tx.guideCard.upsert({
        where: { sectionId_index: { sectionId, index: card.index } },
        create: { sectionId, index: card.index, ...data },
        update: data,
      });
      await replaceTranslations(tx, 'guideCardTranslation', 'guideCardId', row.id, translations(card, (t) => ({
        title: t.title, eyebrow: t.eyebrow ?? null, summary: t.summary ?? null, advice: t.advice ?? null,
      })));
      await tx.guideCardList.deleteMany({ where: { cardId: row.id } });
      for (const [p, l] of ((card.lists ?? []) as Json[]).entries()) {
        const listRow = await tx.guideCardList.create({ data: { cardId: row.id, position: p } });
        await replaceTranslations(tx, 'guideCardListTranslation', 'guideCardListId', listRow.id,
          translations(l, (t) => ({ label: t.label ?? null, items: (t.items as string[]).join('\n') })));
      }
      count += 1;
    }
  }
  return count;
}
