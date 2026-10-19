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

vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn().mockResolvedValue([{ code: 'en', isDefault: true }, { code: 'fr', isDefault: false }]) },
    campaign: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    campaignMember: { upsert: vi.fn(), deleteMany: vi.fn() },
    character: { findFirst: vi.fn() },
    quest: { findFirst: vi.fn() },
    npc: { findFirst: vi.fn() },
  },
}));

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
  sessions: [{ id: 1, number: 1, playedOn: new Date('2026-10-10T00:00:00Z'), title: 'Départ', summary: 'Résumé', gmNotes: 'Secret du MJ' }],
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
    expect(res.body.sessions[0]).toMatchObject({ summary: 'Résumé', gmNotes: null, playedOn: '2026-10-10' });
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
