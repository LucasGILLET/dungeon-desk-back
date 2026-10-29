import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';
import { evaluateEncounter } from '../campaigns/encounter';

// Utilisateur connecté : id 1
vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../prismaClient', () => {
  const db: any = {
    locale: { findMany: vi.fn().mockResolvedValue([{ code: 'en', isDefault: true }, { code: 'fr', isDefault: false }]) },
    campaign: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    campaignMember: { upsert: vi.fn(), deleteMany: vi.fn() },
    campaignGmCharacter: { upsert: vi.fn(), deleteMany: vi.fn() },
    character: { findFirst: vi.fn() },
    quest: { findFirst: vi.fn() },
    npc: { findFirst: vi.fn() },
    campaignSession: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn() },
    campaignNpc: { count: vi.fn() },
    campaignSessionNpc: { deleteMany: vi.fn(), createMany: vi.fn() },
    // Écritures : la transaction reçoit le même client
    $transaction: vi.fn((write: (tx: any) => unknown) => write(db)),
  };
  return { default: db };
});

const user = (id: number, username: string) => ({ id, username });
// Campagne telle que la renvoie findUniqueOrThrow (include)
const stored = (questsForRole: object[]) => ({
  id: 5, name: 'La mine perdue', description: null, theme: null, status: 'ACTIVE', inviteCode: 'secret-code', createdAt: '', updatedAt: '',
  edition: { code: '2014' },
  user: user(2, 'MJ'),
  members: [{
    joinedAt: '', user: user(1, 'Moi'),
    character: { id: 9, name: 'Test moine', race: { index: 'human', translations: [{ localeCode: 'fr', name: 'Humain' }] },
      classes: [{ class: { index: 'monk', translations: [{ localeCode: 'fr', name: 'Moine' }] }, _count: { levels: 3 } }] },
  }],
  gmCharacters: [] as object[],
  sessions: [{ id: 1, number: 1, playedOn: new Date('2026-10-10T00:00:00Z'), title: 'Départ', summary: 'Résumé', gmNotes: 'Secret du MJ', npcs: [{ campaignNpcId: 4 }] }],
  quests: questsForRole,
  npcs: [],
  encounters: [],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Encounter difficulty', () => {
  it('applies the multiplier for the number of monsters and the party size', () => {
    // 4 personnages de niveau 1 (seuils 100/200/300/400) contre 2 gobelins (2 × 50 XP × 1,5)
    expect(evaluateEncounter([{ xp: 50, count: 2 }], [1, 1, 1, 1])).toMatchObject({ totalXp: 100, adjustedXp: 150, multiplier: 1.5, difficulty: 'EASY' });
    // 4 orcs (100 XP) : ×2 → 800 ≥ seuil mortel 400
    expect(evaluateEncounter([{ xp: 100, count: 4 }], [1, 1, 1, 1]).difficulty).toBe('DEADLY');
    // 2 personnages seulement : multiplicateur supérieur (1 monstre → ×1,5)
    expect(evaluateEncounter([{ xp: 200, count: 1 }], [3, 3]).multiplier).toBe(1.5);
    // 6 personnages : multiplicateur inférieur (1 monstre → ×0,5)
    expect(evaluateEncounter([{ xp: 200, count: 1 }], [5, 5, 5, 5, 5, 5]).multiplier).toBe(0.5);
  });

  it('has no difficulty without characters of known level', () => {
    expect(evaluateEncounter([{ xp: 50, count: 1 }], [])).toMatchObject({ difficulty: null, thresholds: null, adjustedXp: 50 });
  });
});

describe('Campaign access', () => {
  it('hides GM notes, invite code, NPCs and encounters from a player', async () => {
    // L'utilisateur 1 est membre, le MJ est l'utilisateur 2
    (prisma.campaign.findUnique as any).mockResolvedValue({ userId: 2, editionId: 1, members: [{ id: 3 }] });
    (prisma.campaign.findUniqueOrThrow as any).mockResolvedValue(stored([]));

    const res = await request(app).get('/api/campaigns/5?lang=fr');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'PLAYER', inviteCode: null, npcs: [], encounters: [], partyLevels: [3] });
    // Ni les notes du MJ ni les PNJ présents
    expect(res.body.sessions[0]).toMatchObject({ summary: 'Résumé', gmNotes: null, playedOn: '2026-10-10', campaignNpcIds: [] });
    expect(res.body.members[0]).toMatchObject({ isMe: true, character: { name: 'Test moine', level: 3, race: 'Humain' } });
    // Seules les quêtes révélées sont demandées pour un joueur
    expect((prisma.campaign.findUniqueOrThrow as any).mock.calls[0][0].include.quests.where).toEqual({ revealed: true });
  });

  it('returns 404 to a user outside the campaign and 403 to a player who edits it', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValueOnce({ userId: 2, editionId: 1, members: [] });
    expect((await request(app).get('/api/campaigns/5')).status).toBe(404);

    (prisma.campaign.findUnique as any).mockResolvedValueOnce({ userId: 2, editionId: 1, members: [{ id: 3 }] });
    expect((await request(app).post('/api/campaigns/5/quests').send({ title: 'Trouver la mine' })).status).toBe(403);
  });

  it('joins with an invitation using one of the user\'s own characters', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue({ id: 5, userId: 2 });
    (prisma.character.findFirst as any).mockResolvedValueOnce(null);
    const refused = await request(app).post('/api/campaigns/invite/secret-code/join').send({ characterId: 42 });
    expect(refused.status).toBe(400);

    (prisma.character.findFirst as any).mockResolvedValueOnce({ id: 9 });
    const joined = await request(app).post('/api/campaigns/invite/secret-code/join').send({ characterId: 9 });
    expect(joined.status).toBe(201);
    expect((prisma.campaignMember.upsert as any).mock.calls[0][0].create).toEqual({ campaignId: 5, userId: 1, characterId: 9 });
  });

  it('refuses that the game master joins their own campaign', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue({ id: 5, userId: 1 });
    expect((await request(app).post('/api/campaigns/invite/secret-code/join').send({})).status).toBe(400);
  });
});

describe('Game master characters', () => {
  const gmOf = (gmId: number) => ({ userId: gmId, editionId: 1, members: [] });

  it('shows the game master characters to the players and counts them in the party', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue({ userId: 2, editionId: 1, members: [{ id: 3 }] });
    const campaign = stored([]);
    campaign.gmCharacters = [{ character: { id: 12, name: 'Compagnon', race: { index: 'elf', translations: [{ localeCode: 'fr', name: 'Elfe' }] },
      classes: [{ class: { index: 'ranger', translations: [{ localeCode: 'fr', name: 'Rôdeur' }] }, _count: { levels: 2 } }] } }];
    (prisma.campaign.findUniqueOrThrow as any).mockResolvedValue(campaign);

    const res = await request(app).get('/api/campaigns/5?lang=fr');

    expect(res.body.gmCharacters).toEqual([{ id: 12, name: 'Compagnon', level: 2, race: 'Elfe', classes: [{ name: 'Rôdeur', level: 2 }] }]);
    expect(res.body.partyLevels).toEqual([3, 2]);
  });

  it('lets the game master add one of their own characters', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue(gmOf(1));
    (prisma.character.findFirst as any).mockResolvedValue({ id: 12 });

    const res = await request(app).post('/api/campaigns/5/gm-characters').send({ characterId: 12 });

    expect(res.status).toBe(201);
    // Le personnage est cherché parmi ceux du MJ connecté
    expect((prisma.character.findFirst as any).mock.calls[0][0].where).toEqual({ id: 12, userId: 1 });
    expect(prisma.campaignGmCharacter.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { campaignId: 5, characterId: 12 } }));
  });

  it("refuses another user's character, and a player who adds a character", async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue(gmOf(1));
    (prisma.character.findFirst as any).mockResolvedValue(null);
    const foreign = await request(app).post('/api/campaigns/5/gm-characters').send({ characterId: 99 });
    expect(foreign.status).toBe(400);

    (prisma.campaign.findUnique as any).mockResolvedValue({ userId: 2, editionId: 1, members: [{ id: 3 }] });
    const player = await request(app).post('/api/campaigns/5/gm-characters').send({ characterId: 12 });
    expect(player.status).toBe(403);
    expect(prisma.campaignGmCharacter.upsert).not.toHaveBeenCalled();
  });

  it('removes a game master character, 404 when it is not in the campaign', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue(gmOf(1));
    (prisma.campaignGmCharacter.deleteMany as any).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect((await request(app).delete('/api/campaigns/5/gm-characters/12')).status).toBe(200);
    expect((await request(app).delete('/api/campaigns/5/gm-characters/12')).status).toBe(404);
    expect((prisma.campaignGmCharacter.deleteMany as any).mock.calls[0][0].where).toEqual({ campaignId: 5, characterId: 12 });
  });
});

describe('NPCs of sessions and quests', () => {
  beforeEach(() => {
    (prisma.campaign.findUnique as any).mockResolvedValue({ userId: 1, editionId: 1, members: [] });
    (prisma.campaignSession.aggregate as any).mockResolvedValue({ _max: { number: 2 } });
    (prisma.campaignSession.create as any).mockResolvedValue({ id: 8 });
  });

  it('shows the game master which NPCs were met during a session', async () => {
    (prisma.campaign.findUniqueOrThrow as any).mockResolvedValue(stored([]));
    const res = await request(app).get('/api/campaigns/5?lang=fr');
    expect(res.body.sessions[0].campaignNpcIds).toEqual([4]);
  });

  it('links NPCs of the campaign to a new session', async () => {
    (prisma.campaignNpc.count as any).mockResolvedValue(2);

    const res = await request(app).post('/api/campaigns/5/sessions').send({ title: 'Retour', campaignNpcIds: [4, 6, 4] });

    expect(res.status).toBe(201);
    // Cherchés parmi les PNJ de cette campagne, sans doublon
    expect((prisma.campaignNpc.count as any).mock.calls[0][0].where).toEqual({ campaignId: 5, id: { in: [4, 6] } });
    expect((prisma.campaignSessionNpc.createMany as any).mock.calls[0][0].data).toEqual([{ sessionId: 8, campaignNpcId: 4 }, { sessionId: 8, campaignNpcId: 6 }]);
  });

  it("refuses an NPC of another campaign, and keeps the links when the list is not sent", async () => {
    (prisma.campaignNpc.count as any).mockResolvedValue(0);
    const refused = await request(app).post('/api/campaigns/5/sessions').send({ campaignNpcIds: [99] });
    expect(refused.status).toBe(400);
    expect(prisma.campaignSession.create).not.toHaveBeenCalled();

    expect((await request(app).post('/api/campaigns/5/sessions').send({ title: 'Sans PNJ' })).status).toBe(201);
    expect(prisma.campaignSessionNpc.deleteMany).not.toHaveBeenCalled();
  });
});
