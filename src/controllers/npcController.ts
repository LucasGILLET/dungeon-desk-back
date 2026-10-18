import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { NpcInput, npcInputSchema } from '../validators/npcValidator';
import { LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';

// PNJ : référencent la race, la classe et l'alignement (vérifiés dans
// l'édition) ; leurs traits sont du texte libre.

type Issue = { path: string; message: string };

const named = { select: { index: true, translations: { orderBy: { localeCode: 'asc' as const } } } } as const;
const NPC_INCLUDE = {
  edition: { select: { code: true } },
  race: named,
  subrace: named,
  class: named,
  alignment: named,
  abilityScores: { include: { abilityScore: { select: { index: true } } } },
} satisfies Prisma.NpcInclude;
type StoredNpc = Prisma.NpcGetPayload<{ include: typeof NPC_INCLUDE }>;

// Index → id, en vérifiant que tout existe dans l'édition
async function resolve(input: NpcInput): Promise<{ data: Prisma.NpcUncheckedCreateInput; scores: { abilityScoreId: number; score: number }[] } | { errors: Issue[] }> {
  const errors: Issue[] = [];
  const edition = await prisma.edition.findUnique({ where: { code: input.edition }, select: { id: true } });
  if (!edition) return { errors: [{ path: 'edition', message: `Unknown edition "${input.edition}"` }] };
  const key = (index: string) => ({ editionId_index: { editionId: edition.id, index } });
  const [race, subrace, cls, alignment, abilities] = await Promise.all([
    prisma.race.findUnique({ where: key(input.race), select: { id: true } }),
    input.subrace ? prisma.subrace.findUnique({ where: key(input.subrace), select: { id: true, raceId: true } }) : null,
    input.class ? prisma.class.findUnique({ where: key(input.class), select: { id: true } }) : null,
    input.alignment ? prisma.alignment.findUnique({ where: { index: input.alignment }, select: { id: true } }) : null,
    prisma.abilityScore.findMany({ select: { id: true, index: true } }),
  ]);
  if (!race) errors.push({ path: 'race', message: `Unknown race "${input.race}"` });
  if (input.subrace && !subrace) errors.push({ path: 'subrace', message: `Unknown subrace "${input.subrace}"` });
  if (subrace && race && subrace.raceId !== race.id) errors.push({ path: 'subrace', message: `Subrace "${input.subrace}" does not belong to race "${input.race}"` });
  if (input.class && !cls) errors.push({ path: 'class', message: `Unknown class "${input.class}"` });
  if (input.alignment && !alignment) errors.push({ path: 'alignment', message: `Unknown alignment "${input.alignment}"` });
  const scores = Object.entries(input.abilityScores).map(([ability, score]) => {
    const found = abilities.find((a) => a.index === ability);
    if (!found) errors.push({ path: `abilityScores.${ability}`, message: `Unknown ability score "${ability}"` });
    return { abilityScoreId: found?.id ?? 0, score };
  });
  if (errors.length) return { errors };

  const { edition: _e, race: _r, subrace: _s, class: _c, alignment: _a, abilityScores: _scores, ...fields } = input;
  return {
    data: {
      ...fields,
      userId: 0, // renseigné par l'appelant
      editionId: edition.id,
      raceId: race!.id,
      subraceId: subrace?.id ?? null,
      classId: cls?.id ?? null,
      alignmentId: alignment?.id ?? null,
    },
    scores,
  };
}

// PNJ stocké → format d'échange, avec les noms traduits
function toOutput(npc: StoredNpc, lang: LangContext) {
  const name = (x: { translations: { localeCode: string; name: string }[] } | null) => (x ? pick(x.translations, lang).name : null);
  return {
    id: npc.id,
    edition: npc.edition.code,
    name: npc.name,
    firstName: npc.firstName,
    lastName: npc.lastName,
    race: npc.race.index,
    subrace: npc.subrace?.index ?? null,
    class: npc.class?.index ?? null,
    alignment: npc.alignment?.index ?? null,
    gender: npc.gender,
    age: npc.age,
    heightCm: npc.heightCm,
    weightKg: npc.weightKg,
    bodyType: npc.bodyType,
    profession: npc.profession,
    socialStatus: npc.socialStatus,
    relations: npc.relations,
    personality: npc.personality,
    motivation: npc.motivation,
    quirk: npc.quirk,
    history: npc.history,
    notes: npc.notes,
    abilityScores: Object.fromEntries(npc.abilityScores.map((s) => [s.abilityScore.index, s.score])),
    names: { race: name(npc.race), subrace: name(npc.subrace), class: name(npc.class), alignment: name(npc.alignment) },
    createdAt: npc.createdAt,
    updatedAt: npc.updatedAt,
  };
}

async function parse(req: Request, res: Response) {
  const parsed = npcInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid NPC data', errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return null;
  }
  const resolved = await resolve(parsed.data);
  if ('errors' in resolved) {
    res.status(400).json({ message: 'Invalid NPC data', errors: resolved.errors });
    return null;
  }
  return resolved;
}

export const createNpc = async (req: AuthRequest, res: Response) => {
  try {
    const resolved = await parse(req, res);
    if (!resolved) return;
    const npc = await prisma.npc.create({
      data: { ...resolved.data, userId: req.user.id, abilityScores: { create: resolved.scores } },
      include: NPC_INCLUDE,
    });
    res.status(201).json(toOutput(npc, await resolveLang(req)));
  } catch (error) {
    logger.error(`Error creating NPC: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateNpc = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const owned = await prisma.npc.findFirst({ where: { id, userId: req.user.id }, select: { id: true } });
    if (!owned) return res.status(404).json({ message: 'NPC not found' });
    const resolved = await parse(req, res);
    if (!resolved) return;
    const npc = await prisma.$transaction(async (tx) => {
      await tx.npcAbilityScore.deleteMany({ where: { npcId: id } });
      return tx.npc.update({
        where: { id },
        data: { ...resolved.data, userId: req.user.id, abilityScores: { create: resolved.scores } },
        include: NPC_INCLUDE,
      });
    });
    res.json(toOutput(npc, await resolveLang(req)));
  } catch (error) {
    logger.error(`Error updating NPC: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNpcs = async (req: AuthRequest, res: Response) => {
  try {
    const npcs = await prisma.npc.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, include: NPC_INCLUDE });
    const lang = await resolveLang(req);
    res.json(npcs.map((n) => toOutput(n, lang)));
  } catch (error) {
    logger.error(`Error fetching NPCs: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNpcById = async (req: AuthRequest, res: Response) => {
  try {
    const npc = await prisma.npc.findFirst({ where: { id: Number(req.params.id), userId: req.user.id }, include: NPC_INCLUDE });
    if (!npc) return res.status(404).json({ message: 'NPC not found' });
    res.json(toOutput(npc, await resolveLang(req)));
  } catch (error) {
    logger.error(`Error fetching NPC: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNpc = async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await prisma.npc.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } });
    if (deleted.count === 0) return res.status(404).json({ message: 'NPC not found' });
    res.json({ message: 'NPC deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting NPC: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};
