import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';
import prisma from '../prismaClient';
import { evaluateEncounter } from '../campaigns/encounter';
import { LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';
import {
  campaignInputSchema, campaignNpcInputSchema, encounterInputSchema, EncounterInput, gmCharacterInputSchema, membershipInputSchema, questInputSchema, sessionInputSchema,
} from '../validators/campaignValidator';

// Campagnes : le MJ (propriétaire) gère tout ; un membre (joueur invité) lit
// la campagne sans les notes du MJ, les PNJ, les rencontres ni les quêtes non
// révélées. Une campagne inaccessible répond 404, sans dire qu'elle existe.

type Role = 'GM' | 'PLAYER';
type Issue = { path: string; message: string };

const userIdOf = (req: Request): number => (req as Request & { user: { id: number } }).user.id;
const named = { select: { index: true, translations: { orderBy: { localeCode: 'asc' as const } } } } as const;
const nameOf = (lang: LangContext) => (x: { translations: { localeCode: string; name: string }[] } | null) => (x ? pick(x.translations, lang).name : null);
// Nom affiché d'un utilisateur, sans exposer son adresse e-mail aux autres
const displayName = (user: { id: number; username: string | null }) => user.username ?? `Joueur ${user.id}`;
const newInviteCode = () => randomBytes(9).toString('base64url');

export function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
}

export function parse<S extends ZodTypeAny>(schema: S, req: Request, res: Response): z.infer<S> | null {
  const parsed = schema.safeParse(req.body);
  if (parsed.success) return parsed.data;
  res.status(400).json({ message: 'Invalid data', errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  return null;
}

export const invalid = (res: Response, errors: Issue[]) => res.status(400).json({ message: 'Invalid data', errors });

// Paramètre de route entier positif ; null (réponse 400 envoyée) sinon
export function param(req: Request, res: Response, name: string): number | null {
  const value = Number(req.params[name]);
  if (Number.isInteger(value) && value > 0) return value;
  res.status(400).json({ message: `Invalid ${name}` });
  return null;
}

// Rôle de l'utilisateur dans la campagne, ou null s'il n'y a pas accès
async function roleIn(campaignId: number, userId: number): Promise<{ role: Role; editionId: number } | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { userId: true, editionId: true, members: { where: { userId }, select: { id: true } } },
  });
  if (!campaign) return null;
  if (campaign.userId === userId) return { role: 'GM', editionId: campaign.editionId };
  return campaign.members.length ? { role: 'PLAYER', editionId: campaign.editionId } : null;
}

// Campagne du MJ connecté pour une modification ; null (réponse envoyée) sinon
export async function asGm(req: Request, res: Response): Promise<{ id: number; editionId: number; gmId: number } | null> {
  const id = param(req, res, 'id');
  if (!id) return null;
  const access = await roleIn(id, userIdOf(req));
  if (!access) {
    res.status(404).json({ message: 'Campaign not found' });
    return null;
  }
  if (access.role !== 'GM') {
    res.status(403).json({ message: 'Only the game master can change this campaign' });
    return null;
  }
  return { id, editionId: access.editionId, gmId: userIdOf(req) };
}

// --- Lecture ------------------------------------------------------------------------

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const userId = userIdOf(req);
    const campaigns = await prisma.campaign.findMany({
      where: { OR: [{ userId }, { members: { some: { userId } } }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { members: true, sessions: true } },
        // Personnage joué par l'utilisateur, s'il est joueur
        members: { where: { userId }, select: { character: { select: { id: true, name: true } } } },
      },
    });
    res.json(campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      theme: c.theme,
      status: c.status,
      role: (c.userId === userId ? 'GM' : 'PLAYER') as Role,
      gm: displayName(c.user),
      memberCount: c._count.members,
      sessionCount: c._count.sessions,
      myCharacter: c.members[0]?.character ?? null,
      updatedAt: c.updatedAt,
    })));
  } catch (error) {
    fail(res, 'fetching campaigns', error);
  }
};

const characterSummary = {
  select: {
    id: true,
    name: true,
    race: named,
    classes: { orderBy: { position: 'asc' as const }, select: { class: named, _count: { select: { levels: true } } } },
  },
} as const;

export const getCampaign = async (req: Request, res: Response) => {
  try {
    const id = param(req, res, 'id');
    if (!id) return;
    const userId = userIdOf(req);
    const access = await roleIn(id, userId);
    if (!access) return res.status(404).json({ message: 'Campaign not found' });
    const gm = access.role === 'GM';
    const lang = await resolveLang(req);
    const name = nameOf(lang);

    const c = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        edition: { select: { code: true } },
        user: { select: { id: true, username: true } },
        members: { orderBy: { joinedAt: 'asc' }, include: { user: { select: { id: true, username: true } }, character: characterSummary } },
        gmCharacters: { orderBy: { addedAt: 'asc' }, include: { character: characterSummary } },
        sessions: { orderBy: { number: 'asc' } },
        quests: { where: gm ? {} : { revealed: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }], include: { giverNpc: { select: { id: true, name: true } } } },
        // PNJ et rencontres : lus pour le MJ seulement (aucune ligne pour un joueur)
        npcs: { where: gm ? {} : { id: -1 }, orderBy: { id: 'asc' }, include: { npc: { select: { id: true, name: true, profession: true, race: named, class: named } } } },
        encounters: {
          where: gm ? {} : { id: -1 },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          include: { monsters: { orderBy: { id: 'asc' }, include: { monster: { select: { index: true, ownerId: true, xp: true, challengeRating: true, translations: { orderBy: { localeCode: 'asc' } } } } } } },
        },
      },
    });

    // Niveau de chaque personnage : nombre de niveaux pris dans ses classes
    type Summary = NonNullable<(typeof c.members)[number]['character']>;
    const describe = (ch: Summary) => ({
      id: ch.id,
      name: ch.name,
      level: ch.classes.reduce((sum, cl) => sum + cl._count.levels, 0),
      race: name(ch.race),
      classes: ch.classes.map((cl) => ({ name: name(cl.class), level: cl._count.levels })),
    });
    const members = c.members.map((m) => ({
      userId: m.user.id,
      name: displayName(m.user),
      isMe: m.user.id === userId,
      joinedAt: m.joinedAt,
      character: m.character ? describe(m.character) : null,
    }));
    // Personnages joués par le MJ : membres du groupe, visibles par tous
    const gmCharacters = c.gmCharacters.map((g) => describe(g.character));
    const partyLevels = [...members.map((m) => m.character?.level ?? 0), ...gmCharacters.map((g) => g.level)].filter((l) => l > 0);

    res.json({
      id: c.id,
      edition: c.edition.code,
      name: c.name,
      description: c.description,
      theme: c.theme,
      status: c.status,
      role: access.role,
      gm: { id: c.user.id, name: displayName(c.user) },
      inviteCode: gm ? c.inviteCode : null,
      members,
      gmCharacters,
      partyLevels,
      sessions: c.sessions.map((s) => ({
        id: s.id, number: s.number, playedOn: s.playedOn?.toISOString().slice(0, 10) ?? null, title: s.title, summary: s.summary,
        gmNotes: gm ? s.gmNotes : null,
      })),
      quests: c.quests.map((q) => ({
        id: q.id, position: q.position, title: q.title, description: q.description, status: q.status, difficulty: q.difficulty, reward: q.reward,
        revealed: q.revealed, giver: q.giverNpc ? { id: q.giverNpc.id, name: q.giverNpc.name } : null,
      })),
      npcs: gm
        ? c.npcs.map((n) => ({
          id: n.id, npcId: n.npc.id, name: n.npc.name, profession: n.npc.profession, race: name(n.npc.race), class: name(n.npc.class),
          role: n.role, location: n.location, notes: n.notes,
        }))
        : [],
      encounters: gm
        ? c.encounters.map((e) => {
          const monsters = e.monsters.map((em) => ({
            index: em.monster.index, name: pick(em.monster.translations, lang).name, count: em.count, xp: em.monster.xp,
            // Monstre maison du MJ : sa fiche est dans /api/monsters
            homebrew: em.monster.ownerId != null,
            challengeRating: Number(em.monster.challengeRating),
          }));
          return {
            id: e.id, position: e.position, name: e.name, description: e.description, status: e.status, sessionId: e.sessionId, monsters,
            evaluation: evaluateEncounter(monsters, partyLevels),
          };
        })
        : [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  } catch (error) {
    fail(res, 'fetching campaign', error);
  }
};

// --- Campagne -------------------------------------------------------------------------

async function editionId(code: string): Promise<number | null> {
  return (await prisma.edition.findUnique({ where: { code }, select: { id: true } }))?.id ?? null;
}

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const input = parse(campaignInputSchema, req, res);
    if (!input) return;
    const edition = await editionId(input.edition);
    if (!edition) return invalid(res, [{ path: 'edition', message: `Unknown edition "${input.edition}"` }]);
    const { edition: _e, ...fields } = input;
    const campaign = await prisma.campaign.create({ data: { ...fields, userId: userIdOf(req), editionId: edition, inviteCode: newInviteCode() } });
    res.status(201).json({ id: campaign.id });
  } catch (error) {
    fail(res, 'creating campaign', error);
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    const input = parse(campaignInputSchema, req, res);
    if (!input) return;
    // L'édition d'une campagne ne change pas : ses rencontres en dépendent
    const { edition: _e, ...fields } = input;
    await prisma.campaign.update({ where: { id: campaign.id }, data: fields });
    res.json({ id: campaign.id });
  } catch (error) {
    fail(res, 'updating campaign', error);
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    await prisma.campaign.delete({ where: { id: campaign.id } });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    fail(res, 'deleting campaign', error);
  }
};

// Nouveau lien d'invitation : l'ancien cesse de fonctionner
export const regenerateInvite = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: { inviteCode: newInviteCode() } });
    res.json({ inviteCode: updated.inviteCode });
  } catch (error) {
    fail(res, 'regenerating invite', error);
  }
};

// --- Invitation et membres -------------------------------------------------------------

export const getInvite = async (req: Request, res: Response) => {
  try {
    const userId = userIdOf(req);
    const c = await prisma.campaign.findUnique({
      where: { inviteCode: String(req.params.code) },
      include: { user: { select: { id: true, username: true } }, members: { where: { userId }, select: { id: true } }, _count: { select: { members: true } } },
    });
    if (!c) return res.status(404).json({ message: 'Invitation not found' });
    res.json({
      campaignId: c.id, name: c.name, theme: c.theme, gm: displayName(c.user), memberCount: c._count.members,
      isGm: c.userId === userId, alreadyMember: c.members.length > 0,
    });
  } catch (error) {
    fail(res, 'fetching invite', error);
  }
};

// Personnage du joueur connecté (null accepté), ou réponse 400
async function ownCharacter(req: Request, res: Response, characterId: number | null | undefined): Promise<number | null | false> {
  if (characterId == null) return null;
  const owned = await prisma.character.findFirst({ where: { id: characterId, userId: userIdOf(req) }, select: { id: true } });
  if (owned) return owned.id;
  invalid(res, [{ path: 'characterId', message: 'Character not found' }]);
  return false;
}

export const joinCampaign = async (req: Request, res: Response) => {
  try {
    const userId = userIdOf(req);
    const input = parse(membershipInputSchema, req, res);
    if (!input) return;
    const campaign = await prisma.campaign.findUnique({ where: { inviteCode: String(req.params.code) }, select: { id: true, userId: true } });
    if (!campaign) return res.status(404).json({ message: 'Invitation not found' });
    if (campaign.userId === userId) return invalid(res, [{ path: 'code', message: 'The game master cannot join their own campaign' }]);
    const characterId = await ownCharacter(req, res, input.characterId);
    if (characterId === false) return;
    await prisma.campaignMember.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId } },
      create: { campaignId: campaign.id, userId, characterId },
      update: { characterId },
    });
    res.status(201).json({ campaignId: campaign.id });
  } catch (error) {
    fail(res, 'joining campaign', error);
  }
};

// Le joueur change le personnage qu'il joue dans la campagne
export const updateMembership = async (req: Request, res: Response) => {
  try {
    const id = param(req, res, 'id');
    if (!id) return;
    const input = parse(membershipInputSchema, req, res);
    if (!input) return;
    const characterId = await ownCharacter(req, res, input.characterId);
    if (characterId === false) return;
    const updated = await prisma.campaignMember.updateMany({ where: { campaignId: id, userId: userIdOf(req) }, data: { characterId } });
    if (!updated.count) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ campaignId: id });
  } catch (error) {
    fail(res, 'updating membership', error);
  }
};

// Le MJ retire un joueur, ou un joueur quitte la campagne
export const removeMember = async (req: Request, res: Response) => {
  try {
    const id = param(req, res, 'id');
    const memberId = id && param(req, res, 'userId');
    if (!id || !memberId) return;
    const userId = userIdOf(req);
    const access = await roleIn(id, userId);
    if (!access) return res.status(404).json({ message: 'Campaign not found' });
    if (access.role !== 'GM' && memberId !== userId) return res.status(403).json({ message: 'Only the game master can remove another player' });
    const deleted = await prisma.campaignMember.deleteMany({ where: { campaignId: id, userId: memberId } });
    if (!deleted.count) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member removed' });
  } catch (error) {
    fail(res, 'removing member', error);
  }
};

// Le MJ ajoute un de ses personnages au groupe, ou l'en retire
export const addGmCharacter = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    const input = parse(gmCharacterInputSchema, req, res);
    if (!input) return;
    const characterId = await ownCharacter(req, res, input.characterId);
    if (!characterId) return;
    await prisma.campaignGmCharacter.upsert({
      where: { campaignId_characterId: { campaignId: campaign.id, characterId } },
      create: { campaignId: campaign.id, characterId },
      update: {},
    });
    res.status(201).json({ campaignId: campaign.id, characterId });
  } catch (error) {
    fail(res, 'adding game master character', error);
  }
};

export const removeGmCharacter = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    const characterId = campaign && param(req, res, 'characterId');
    if (!campaign || !characterId) return;
    const deleted = await prisma.campaignGmCharacter.deleteMany({ where: { campaignId: campaign.id, characterId } });
    if (!deleted.count) return res.status(404).json({ message: 'Character not in campaign' });
    res.json({ message: 'Character removed' });
  } catch (error) {
    fail(res, 'removing game master character', error);
  }
};

// --- Contenu (MJ) ---------------------------------------------------------------------------

// Création / modification / suppression d'un élément rattaché à la campagne
function child<S extends ZodTypeAny, M extends 'campaignSession' | 'quest' | 'campaignNpc' | 'encounter'>(options: {
  model: M
  what: string
  schema: S
  // Données à écrire ; un tableau = erreurs de validation
  data: (input: z.infer<S>, campaign: { id: number; editionId: number; gmId: number }, existingId: number | null) => Promise<Record<string, unknown> | Issue[]>
  // Écritures liées (monstres d'une rencontre), dans la même transaction
  after?: (tx: Prisma.TransactionClient, id: number, input: z.infer<S>, campaign: { id: number; editionId: number; gmId: number }) => Promise<void>
}) {
  const delegate = (db: Prisma.TransactionClient | typeof prisma) => (db as any)[options.model];
  const touch = (db: Prisma.TransactionClient, id: number) => db.campaign.update({ where: { id }, data: { updatedAt: new Date() } });

  const write = (mode: 'create' | 'update') => async (req: Request, res: Response) => {
    try {
      const campaign = await asGm(req, res);
      if (!campaign) return;
      const childId = mode === 'update' ? param(req, res, 'childId') : null;
      if (mode === 'update' && !childId) return;
      if (childId && !(await delegate(prisma).findFirst({ where: { id: childId, campaignId: campaign.id }, select: { id: true } }))) {
        return res.status(404).json({ message: `${options.what} not found` });
      }
      const input = parse(options.schema, req, res);
      if (!input) return;
      const data = await options.data(input, campaign, childId);
      if (Array.isArray(data)) return invalid(res, data);
      const id = await prisma.$transaction(async (tx) => {
        const row = childId
          ? await delegate(tx).update({ where: { id: childId }, data })
          : await delegate(tx).create({ data: { ...data, campaignId: campaign.id } });
        await options.after?.(tx, row.id, input, campaign);
        await touch(tx, campaign.id);
        return row.id as number;
      });
      res.status(childId ? 200 : 201).json({ id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ message: `${options.what} already exists` });
      }
      fail(res, `writing ${options.what}`, error);
    }
  };

  const remove = async (req: Request, res: Response) => {
    try {
      const campaign = await asGm(req, res);
      const childId = campaign && param(req, res, 'childId');
      if (!campaign || !childId) return;
      const deleted = await delegate(prisma).deleteMany({ where: { id: childId, campaignId: campaign.id } });
      if (!deleted.count) return res.status(404).json({ message: `${options.what} not found` });
      res.json({ message: `${options.what} deleted` });
    } catch (error) {
      fail(res, `deleting ${options.what}`, error);
    }
  };

  return { create: write('create'), update: write('update'), remove };
}

// PNJ du MJ connecté (PNJ d'un autre utilisateur refusé)
async function gmNpc(campaignId: number, npcId: number): Promise<boolean> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { userId: true } });
  return !!(await prisma.npc.findFirst({ where: { id: npcId, userId: campaign.userId }, select: { id: true } }));
}

async function nextPosition(model: 'quest' | 'encounter', campaignId: number): Promise<number> {
  const last = await (prisma as any)[model].aggregate({ where: { campaignId }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

export const sessions = child({
  model: 'campaignSession',
  what: 'Session',
  schema: sessionInputSchema,
  data: async (input, campaign, existingId) => {
    const number = input.number
      ?? (existingId ? undefined : ((await prisma.campaignSession.aggregate({ where: { campaignId: campaign.id }, _max: { number: true } }))._max.number ?? 0) + 1);
    return {
      ...(number !== undefined && { number }),
      playedOn: input.playedOn ? new Date(`${input.playedOn}T00:00:00Z`) : null,
      title: input.title ?? null,
      summary: input.summary ?? null,
      gmNotes: input.gmNotes ?? null,
    };
  },
});

export const quests = child({
  model: 'quest',
  what: 'Quest',
  schema: questInputSchema,
  data: async (input, campaign, existingId) => {
    if (input.giverNpcId && !(await gmNpc(campaign.id, input.giverNpcId))) return [{ path: 'giverNpcId', message: 'NPC not found' }];
    const { position, ...fields } = input;
    return {
      ...fields,
      giverNpcId: input.giverNpcId ?? null,
      ...(position !== undefined ? { position } : existingId ? {} : { position: await nextPosition('quest', campaign.id) }),
    };
  },
});

export const campaignNpcs = child({
  model: 'campaignNpc',
  what: 'Campaign NPC',
  schema: campaignNpcInputSchema,
  data: async (input, campaign) => {
    if (!(await gmNpc(campaign.id, input.npcId))) return [{ path: 'npcId', message: 'NPC not found' }];
    return { npcId: input.npcId, role: input.role ?? null, location: input.location ?? null, notes: input.notes ?? null };
  },
});

// Monstres de la rencontre : index → id dans l'édition de la campagne
// Monstres du SRD ou monstres maison du MJ (jamais ceux d'un autre utilisateur)
async function resolveMonsters(input: EncounterInput, editionId: number, userId: number): Promise<{ monsterId: number; count: number }[] | Issue[]> {
  const indexes = [...new Set(input.monsters.map((m) => m.monster))];
  const found = await prisma.monster.findMany({
    where: { editionId, index: { in: indexes }, OR: [{ ownerId: null }, { ownerId: userId }] },
    select: { id: true, index: true },
  });
  const ids = new Map(found.map((m) => [m.index, m.id]));
  const missing = indexes.filter((i) => !ids.has(i));
  if (missing.length) return missing.map((i) => ({ path: 'monsters', message: `Unknown monster "${i}"` }));
  // Un même monstre listé deux fois : nombres additionnés
  const counts = new Map<number, number>();
  for (const m of input.monsters) counts.set(ids.get(m.monster)!, (counts.get(ids.get(m.monster)!) ?? 0) + m.count);
  return [...counts].map(([monsterId, count]) => ({ monsterId, count: Math.min(count, 100) }));
}

export const encounters = child({
  model: 'encounter',
  what: 'Encounter',
  schema: encounterInputSchema,
  data: async (input, campaign, existingId) => {
    const errors: Issue[] = [];
    if (input.sessionId && !(await prisma.campaignSession.findFirst({ where: { id: input.sessionId, campaignId: campaign.id }, select: { id: true } }))) {
      errors.push({ path: 'sessionId', message: 'Session not found' });
    }
    const monsters = await resolveMonsters(input, campaign.editionId, campaign.gmId);
    if (monsters.length && 'path' in monsters[0]) errors.push(...(monsters as Issue[]));
    if (errors.length) return errors;
    const { position, monsters: _m, ...fields } = input;
    return {
      ...fields,
      sessionId: input.sessionId ?? null,
      ...(position !== undefined ? { position } : existingId ? {} : { position: await nextPosition('encounter', campaign.id) }),
    };
  },
  after: async (tx, id, input, campaign) => {
    const monsters = (await resolveMonsters(input, campaign.editionId, campaign.gmId)) as { monsterId: number; count: number }[];
    await tx.encounterMonster.deleteMany({ where: { encounterId: id } });
    await tx.encounterMonster.createMany({ data: monsters.map((m) => ({ ...m, encounterId: id })) });
  },
});
