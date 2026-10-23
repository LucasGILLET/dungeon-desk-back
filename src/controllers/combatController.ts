import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { encounterCombatants, healthLabel, partyCombatants } from '../campaigns/combat';
import { pick, resolveLang } from '../srd/lang';
import { combatCreateSchema, CombatState, combatStateSchema } from '../validators/campaignValidator';
import { asGm, fail, invalid, param, parse } from './campaignController';

// Gestionnaire de combat du MJ (routes /campaigns/:id/combats) et vue censurée
// partagée avec les joueurs par un lien (/combat-view/:code).

type Issue = { path: string; message: string };
const translations = { orderBy: { localeCode: 'asc' as const } };
const combatInclude = {
  combatants: {
    orderBy: { position: 'asc' as const },
    include: {
      // PV de la fiche : ceux du combat pour un personnage
      character: { select: { id: true, name: true, currentHitPoints: true, temporaryHitPoints: true } },
      monster: { select: { index: true, ownerId: true, translations } },
    },
  },
};

async function combatOf(campaignId: number, combatId: number) {
  return prisma.combat.findFirst({ where: { id: combatId, campaignId }, include: combatInclude });
}
type StoredCombat = NonNullable<Awaited<ReturnType<typeof combatOf>>>;

function describe(c: StoredCombat, lang: Awaited<ReturnType<typeof resolveLang>>) {
  return {
    id: c.id,
    name: c.name,
    encounterId: c.encounterId,
    round: c.round,
    turn: c.turn,
    finished: c.finished,
    shareCode: c.shareCode,
    updatedAt: c.updatedAt,
    combatants: c.combatants.map((x) => {
      // Personnage : PV lus sur sa fiche (null = au maximum)
      const hitPoints = x.character ? x.character.currentHitPoints ?? x.maxHitPoints : x.hitPoints;
      const tempHitPoints = x.character ? x.character.temporaryHitPoints : x.tempHitPoints;
      return {
      id: x.id,
      kind: x.kind,
      character: x.character && { id: x.character.id, name: x.character.name },
      monster: x.monster ? { index: x.monster.index, name: pick(x.monster.translations, lang).name, homebrew: x.monster.ownerId != null } : null,
      name: x.name,
      initiative: x.initiative,
      initiativeBonus: x.initiativeBonus,
      armorClass: x.armorClass,
      maxHitPoints: x.maxHitPoints,
      hitPoints,
      tempHitPoints,
      syncedHitPoints: x.character ? hitPoints : null,
      syncedTempHitPoints: x.character ? tempHitPoints : null,
      conditions: x.conditions as string[],
      note: x.note,
      hidden: x.hidden,
      };
    }),
  };
}

// Liens d'un état envoyé : personnages du groupe seulement, monstres du SRD ou
// du MJ, états connus
async function resolveState(state: CombatState, campaign: { id: number; editionId: number; gmId: number }) {
  const errors: Issue[] = [];
  const indexes = [...new Set(state.combatants.flatMap((c) => (c.monster ? [c.monster] : [])))];
  const conditionIndexes = [...new Set(state.combatants.flatMap((c) => c.conditions))];
  const [party, monsters, conditions] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
      select: { members: { select: { characterId: true } }, gmCharacters: { select: { characterId: true } } },
    }),
    prisma.monster.findMany({
      where: { editionId: campaign.editionId, index: { in: indexes }, OR: [{ ownerId: null }, { ownerId: campaign.gmId }] },
      select: { id: true, index: true },
    }),
    prisma.condition.findMany({ where: { index: { in: conditionIndexes } }, select: { index: true } }),
  ]);
  const partyIds = new Set([...party.members.map((m) => m.characterId), ...party.gmCharacters.map((g) => g.characterId)]);
  const monsterIds = new Map(monsters.map((m) => [m.index, m.id]));
  const known = new Set(conditions.map((c) => c.index));

  const rows = state.combatants.map((c, i) => {
    const path = `combatants[${i}]`;
    if (c.characterId != null && (c.kind !== 'CHARACTER' || !partyIds.has(c.characterId))) errors.push({ path: `${path}.characterId`, message: 'Character not in the party' });
    if (c.monster && (c.kind !== 'MONSTER' || !monsterIds.has(c.monster))) errors.push({ path: `${path}.monster`, message: `Unknown monster "${c.monster}"` });
    c.conditions.filter((k) => !known.has(k)).forEach((k) => errors.push({ path: `${path}.conditions`, message: `Unknown condition "${k}"` }));
    const max = c.maxHitPoints ?? null;
    return {
      position: i,
      kind: c.kind,
      characterId: c.characterId ?? null,
      monsterId: c.monster ? monsterIds.get(c.monster) ?? null : null,
      name: c.name,
      initiative: c.initiative ?? null,
      initiativeBonus: c.initiativeBonus,
      armorClass: c.armorClass ?? null,
      maxHitPoints: max,
      // Jamais au-dessus du maximum
      hitPoints: c.hitPoints == null ? null : max != null ? Math.min(c.hitPoints, max) : c.hitPoints,
      tempHitPoints: c.tempHitPoints,
      conditions: [...new Set(c.conditions)],
      note: c.note ?? null,
      hidden: c.hidden,
    };
  });
  return { rows, errors };
}

// --- MJ ----------------------------------------------------------------------------------

export const getCombats = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    const combats = await prisma.combat.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ finished: 'asc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, round: true, finished: true, encounterId: true, updatedAt: true, _count: { select: { combatants: true } } },
    });
    res.json(combats.map(({ _count, ...c }) => ({ ...c, combatantCount: _count.combatants })));
  } catch (error) {
    fail(res, 'fetching combats', error);
  }
};

// Nouveau combat : le groupe de la campagne, et les monstres d'une rencontre
// s'il en est donné une ; l'initiative reste à lancer
export const createCombat = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    if (!campaign) return;
    const input = parse(combatCreateSchema, req, res);
    if (!input) return;
    const lang = await resolveLang(req);
    const encounter = input.encounterId
      ? await prisma.encounter.findFirst({ where: { id: input.encounterId, campaignId: campaign.id }, select: { id: true, name: true } })
      : null;
    if (input.encounterId && !encounter) return invalid(res, [{ path: 'encounterId', message: 'Encounter not found' }]);
    const combatants = [...await partyCombatants(campaign.id, lang), ...(encounter ? await encounterCombatants(encounter.id, lang) : [])];
    const combat = await prisma.combat.create({
      data: {
        campaignId: campaign.id,
        encounterId: encounter?.id ?? null,
        name: input.name ?? encounter?.name ?? 'Combat',
        combatants: { create: combatants.map((c, position) => ({ ...c, position })) },
      },
      select: { id: true },
    });
    res.status(201).json({ id: combat.id });
  } catch (error) {
    fail(res, 'creating combat', error);
  }
};

export const getCombat = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    const combatId = campaign && param(req, res, 'combatId');
    if (!campaign || !combatId) return;
    const combat = await combatOf(campaign.id, combatId);
    if (!combat) return res.status(404).json({ message: 'Combat not found' });
    res.json(describe(combat, await resolveLang(req)));
  } catch (error) {
    fail(res, 'fetching combat', error);
  }
};

// État complet (ordre, round, tour, combattants) : remplace l'état enregistré
export const saveCombat = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    const combatId = campaign && param(req, res, 'combatId');
    if (!campaign || !combatId) return;
    const state = parse(combatStateSchema, req, res);
    if (!state) return;
    const existing = await prisma.combat.findFirst({ where: { id: combatId, campaignId: campaign.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: 'Combat not found' });
    const { rows, errors } = await resolveState(state, campaign);
    if (errors.length) return invalid(res, errors);
    const turn = rows.length ? Math.min(state.turn, rows.length - 1) : 0;
    // PV des personnages : reportés sur la fiche s'ils ont changé dans le combat
    const characterUpdates = state.combatants.flatMap((c, i) => {
      const row = rows[i]!;
      if (row.kind !== 'CHARACTER' || row.characterId == null) return [];
      const data: { currentHitPoints?: number | null; temporaryHitPoints?: number } = {};
      if (c.syncedHitPoints === undefined || row.hitPoints !== (c.syncedHitPoints ?? null)) {
        data.currentHitPoints = row.hitPoints == null || (row.maxHitPoints != null && row.hitPoints >= row.maxHitPoints) ? null : row.hitPoints;
      }
      if (c.syncedTempHitPoints === undefined || row.tempHitPoints !== (c.syncedTempHitPoints ?? 0)) data.temporaryHitPoints = row.tempHitPoints;
      return Object.keys(data).length ? [prisma.character.update({ where: { id: row.characterId }, data })] : [];
    });
    await prisma.$transaction([
      ...characterUpdates,
      prisma.combatant.deleteMany({ where: { combatId } }),
      prisma.combat.update({
        where: { id: combatId },
        data: { name: state.name, round: state.round, turn, finished: state.finished, combatants: { create: rows } },
      }),
    ]);
    const combat = await combatOf(campaign.id, combatId);
    res.json(describe(combat!, await resolveLang(req)));
  } catch (error) {
    fail(res, 'saving combat', error);
  }
};

export const deleteCombat = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    const combatId = campaign && param(req, res, 'combatId');
    if (!campaign || !combatId) return;
    const deleted = await prisma.combat.deleteMany({ where: { id: combatId, campaignId: campaign.id } });
    if (!deleted.count) return res.status(404).json({ message: 'Combat not found' });
    res.json({ message: 'Combat deleted' });
  } catch (error) {
    fail(res, 'deleting combat', error);
  }
};

// Lien de la vue des joueurs : créé (ou renouvelé, l'ancien cesse de marcher), ou retiré
export const shareCombat = async (req: Request, res: Response) => {
  try {
    const campaign = await asGm(req, res);
    const combatId = campaign && param(req, res, 'combatId');
    if (!campaign || !combatId) return;
    const shareCode = req.method === 'DELETE' ? null : randomBytes(9).toString('base64url');
    const updated = await prisma.combat.updateMany({ where: { id: combatId, campaignId: campaign.id }, data: { shareCode } });
    if (!updated.count) return res.status(404).json({ message: 'Combat not found' });
    res.json({ shareCode });
  } catch (error) {
    fail(res, 'sharing combat', error);
  }
};

// --- Vue des joueurs (publique, par le lien) ---------------------------------------------

// Ordre d'initiative et tour en cours ; les personnages avec leurs PV, les
// créatures du MJ sans statistiques (état de santé seulement), les créatures
// masquées absentes, sans trou dans l'ordre (le tour suit le combattant visible)
export const getCombatView = async (req: Request, res: Response) => {
  try {
    const combat = await prisma.combat.findUnique({
      where: { shareCode: String(req.params.code) },
      include: {
        campaign: { select: { name: true } },
        combatants: { orderBy: { position: 'asc' }, include: { character: { select: { currentHitPoints: true, temporaryHitPoints: true } } } },
      },
    });
    if (!combat) return res.status(404).json({ message: 'Combat not found' });
    const current = combat.combatants[combat.turn];
    const visible = combat.combatants.filter((c) => !c.hidden);
    res.set('Cache-Control', 'no-store');
    res.json({
      name: combat.name,
      campaign: combat.campaign.name,
      round: combat.round,
      finished: combat.finished,
      // Tour d'une créature masquée : aucun tour affiché
      currentId: current && !current.hidden ? current.id : null,
      combatants: visible.map((c) => {
        const pc = c.kind === 'CHARACTER';
        // Personnage lié : PV de sa fiche
        const hitPoints = c.character ? c.character.currentHitPoints ?? c.maxHitPoints : c.hitPoints;
        const tempHitPoints = c.character ? c.character.temporaryHitPoints : c.tempHitPoints;
        return {
          id: c.id,
          name: c.name,
          kind: c.kind,
          initiative: c.initiative,
          conditions: c.conditions as string[],
          hitPoints: pc ? hitPoints : null,
          maxHitPoints: pc ? c.maxHitPoints : null,
          tempHitPoints: pc ? tempHitPoints : null,
          health: healthLabel(hitPoints, c.maxHitPoints),
        };
      }),
      updatedAt: combat.updatedAt,
    });
  } catch (error) {
    fail(res, 'fetching combat view', error);
  }
};
