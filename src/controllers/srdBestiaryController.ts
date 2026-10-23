import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { detailInclude, monsterDetail, monsterSummary, summaryInclude } from '../monsters/serialize';
import { allLangs, LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';
import { setCache } from '../srd/cache';

// Bestiaire et objets magiques : liste légère pour la recherche et le filtrage,
// fiche détaillée par index (bloc de statistiques complet, description).

const t = allLangs;
const named = { select: { index: true, translations: t } } as const;
type Named = { index: string; translations: { localeCode: string; name: string }[] };

const refOf = (ctx: LangContext) => (x: Named | null) => (x ? { index: x.index, name: pick(x.translations, ctx).name } : null);
const editionWhere = (req: Request) => ({ edition: { code: req.params.edition } });

function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error fetching SRD ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
}

// --- Monstres -----------------------------------------------------------------------

// Contenu maison : jamais public, seulement pour son auteur (/api/monsters)
const publicMonsters = (req: Request) => ({ ...editionWhere(req), ownerId: null });

export const getMonsters = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const monsters = await prisma.monster.findMany({ where: publicMonsters(req), orderBy: { index: 'asc' }, include: summaryInclude });
    setCache(res);
    res.json(monsters.map((m) => monsterSummary(m, ctx)));
  } catch (error) {
    fail(res, 'monsters', error);
  }
};

export const getMonsterByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const m = await prisma.monster.findFirst({ where: { ...publicMonsters(req), index: req.params.index }, include: detailInclude });
    if (!m) {
      res.status(404).json({ message: 'Monster not found' });
      return;
    }
    setCache(res);
    res.json(monsterDetail(m, ctx));
  } catch (error) {
    fail(res, 'monster', error);
  }
};

// --- Objets magiques -------------------------------------------------------------------

export const getMagicItems = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const items = await prisma.magicItem.findMany({
      where: editionWhere(req),
      orderBy: { index: 'asc' },
      include: { translations: { ...t, select: { localeCode: true, name: true, subtitle: true } }, equipmentCategory: named, parent: { select: { index: true } } },
    });
    setCache(res);
    res.json(items.map((i) => {
      const it = pick(i.translations, ctx);
      return {
        index: i.index,
        name: it.name,
        lang: it.lang,
        source: i.source,
        subtitle: it.subtitle,
        category: ref(i.equipmentCategory)!,
        rarity: i.rarity,
        requiresAttunement: i.requiresAttunement,
        // Variante d'un objet générique ("Arme +1" → "arme, +1, +2 ou +3")
        variantOf: i.parent?.index ?? null,
        imageUrl: i.imageUrl,
      };
    }));
  } catch (error) {
    fail(res, 'magic items', error);
  }
};

export const getMagicItemByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const i = await prisma.magicItem.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: {
        translations: t,
        equipmentCategory: named,
        parent: { select: { index: true, translations: t } },
        variants: { orderBy: { id: 'asc' }, select: { index: true, rarity: true, translations: t } },
      },
    });
    if (!i) {
      res.status(404).json({ message: 'Magic item not found' });
      return;
    }
    const it = pick(i.translations, ctx);
    setCache(res);
    res.json({
      index: i.index,
      name: it.name,
      lang: it.lang,
      source: i.source,
      subtitle: it.subtitle,
      description: it.description,
      category: ref(i.equipmentCategory)!,
      rarity: i.rarity,
      requiresAttunement: i.requiresAttunement,
      variantOf: i.parent ? ref(i.parent) : null,
      variants: i.variants.map((v) => ({ ...ref(v)!, rarity: v.rarity })),
      imageUrl: i.imageUrl,
    });
  } catch (error) {
    fail(res, 'magic item', error);
  }
};
