import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { allLangs, LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';

// Règles du SRD (sommaire, puis une section à la fois) et guides de
// l'application (pages publiées, avec leurs sections et cartes).

const t = allLangs;
const named = { select: { index: true, translations: t } } as const;
type Named = { index: string; translations: { localeCode: string; name: string }[] };

const refOf = (ctx: LangContext) => (x: Named | null) => (x ? { index: x.index, name: pick(x.translations, ctx).name } : null);
const editionWhere = (req: Request) => ({ edition: { code: req.params.edition } });

function setCache(res: Response) {
  res.set('Cache-Control', 'public, max-age=3600');
}

function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error fetching SRD ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
}

// --- Règles --------------------------------------------------------------------------

export const getRuleChapters = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const chapters = await prisma.ruleChapter.findMany({
      where: editionWhere(req),
      orderBy: { position: 'asc' },
      include: { translations: t, sections: { orderBy: { position: 'asc' }, select: { index: true, translations: { ...t, select: { localeCode: true, name: true } } } } },
    });
    setCache(res);
    res.json(chapters.map((c) => ({ ...ref(c)!, sections: c.sections.map((s) => ref(s)!) })));
  } catch (error) {
    fail(res, 'rule chapters', error);
  }
};

export const getRuleSection = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const section = await prisma.ruleSection.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: { translations: t, chapter: named },
    });
    if (!section) {
      res.status(404).json({ message: 'Rule section not found' });
      return;
    }
    const st = pick(section.translations, ctx);
    setCache(res);
    res.json({ index: section.index, name: st.name, lang: st.lang, chapter: ref(section.chapter)!, description: st.description });
  } catch (error) {
    fail(res, 'rule section', error);
  }
};

// --- Guides ---------------------------------------------------------------------------

export const getGuides = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const pages = await prisma.guidePage.findMany({ where: { ...editionWhere(req), published: true }, orderBy: { position: 'asc' }, include: { translations: t } });
    setCache(res);
    res.json(pages.map((p) => {
      const pt = pick(p.translations, ctx);
      return { index: p.index, title: pt.title, shortTitle: pt.shortTitle, icon: p.icon, accent: p.accent };
    }));
  } catch (error) {
    fail(res, 'guides', error);
  }
};

export const getGuide = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const page = await prisma.guidePage.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: {
        translations: t,
        sections: {
          orderBy: { position: 'asc' },
          include: {
            translations: t,
            cards: {
              orderBy: { position: 'asc' },
              include: {
                translations: t,
                class: named,
                race: named,
                ruleSection: named,
                detailSection: { select: { index: true } },
                lists: { orderBy: { position: 'asc' }, include: { translations: t } },
              },
            },
          },
        },
      },
    });
    if (!page) {
      res.status(404).json({ message: 'Guide not found' });
      return;
    }
    const pt = pick(page.translations, ctx);
    setCache(res);
    res.json({
      index: page.index,
      lang: pt.lang,
      published: page.published,
      icon: page.icon,
      accent: page.accent,
      title: pt.title,
      shortTitle: pt.shortTitle,
      eyebrow: pt.eyebrow,
      heading: pt.heading,
      intro: pt.intro,
      sections: page.sections.map((s) => {
        const st = s.translations.length ? pick(s.translations, ctx) : null;
        return {
          index: s.index,
          // Niveau de titre : 1 (partie), 2, 3
          level: s.level,
          icon: s.icon,
          accent: s.accent,
          title: st?.title ?? null,
          subtitle: st?.subtitle ?? null,
          body: st?.body ?? null,
          cards: s.cards.map((c) => {
            const ct = pick(c.translations, ctx);
            return {
              index: c.index,
              icon: c.icon,
              accent: c.accent,
              title: ct.title,
              eyebrow: ct.eyebrow,
              summary: ct.summary,
              advice: ct.advice,
              // Listes à puces : une puce par ligne
              lists: c.lists.map((l) => {
                const lt = pick(l.translations, ctx);
                return { label: lt.label ?? null, items: (lt.items ?? '').split('\n').map((i) => i.trim()).filter(Boolean) };
              }),
              class: ref(c.class),
              race: ref(c.race),
              rule: ref(c.ruleSection),
              // Section de la même page qui détaille cette carte
              detail: c.detailSection?.index ?? null,
            };
          }),
        };
      }),
    });
  } catch (error) {
    fail(res, 'guide', error);
  }
};
