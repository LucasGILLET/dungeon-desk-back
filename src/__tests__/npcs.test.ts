import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn().mockResolvedValue([{ code: 'en', isDefault: true }, { code: 'fr', isDefault: false }]) },
    edition: { findUnique: vi.fn() },
    race: { findUnique: vi.fn() },
    subrace: { findUnique: vi.fn() },
    class: { findUnique: vi.fn() },
    alignment: { findUnique: vi.fn() },
    abilityScore: { findMany: vi.fn() },
    npc: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

const tr = (en: string, fr: string) => [{ localeCode: 'en', name: en }, { localeCode: 'fr', name: fr }];
const stored = {
  id: 3, name: 'Bardryn Rumnaheim', firstName: 'Bardryn', lastName: 'Rumnaheim', gender: 'NON_BINARY', age: 19, heightCm: 120, weightKg: 85,
  bodyType: 'Svelte', profession: 'Mendiant', socialStatus: null, relations: null, personality: null, motivation: null, quirk: null, history: null, notes: null,
  edition: { code: '2014' }, race: { index: 'dwarf', translations: tr('Dwarf', 'Nain') }, subrace: null, class: null,
  alignment: { index: 'lawful-good', translations: tr('Lawful Good', 'Loyal bon') },
  abilityScores: [{ score: 16, abilityScore: { index: 'cha' } }], createdAt: '', updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.edition.findUnique as any).mockResolvedValue({ id: 1 });
  (prisma.race.findUnique as any).mockResolvedValue({ id: 10 });
  (prisma.alignment.findUnique as any).mockResolvedValue({ id: 20 });
  (prisma.abilityScore.findMany as any).mockResolvedValue([{ id: 6, index: 'cha' }]);
});

describe('NPC Controller', () => {
  it('creates an NPC from indexes and returns translated names', async () => {
    (prisma.npc.create as any).mockResolvedValue(stored);

    const res = await request(app).post('/api/npcs?lang=fr').send({
      name: 'Bardryn Rumnaheim', race: 'dwarf', alignment: 'lawful-good', gender: 'NON_BINARY', abilityScores: { cha: 16 },
    });

    expect(res.status).toBe(201);
    const data = (prisma.npc.create as any).mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: 1, editionId: 1, raceId: 10, alignmentId: 20, classId: null, abilityScores: { create: [{ abilityScoreId: 6, score: 16 }] } });
    expect(res.body).toMatchObject({ race: 'dwarf', alignment: 'lawful-good', abilityScores: { cha: 16 }, names: { race: 'Nain', alignment: 'Loyal bon' } });
  });

  it('refuses content that does not exist in the edition', async () => {
    (prisma.race.findUnique as any).mockResolvedValue(null);

    const res = await request(app).post('/api/npcs').send({ name: 'X', race: 'warforged' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ path: 'race', message: 'Unknown race "warforged"' }]);
    expect(prisma.npc.create).not.toHaveBeenCalled();
  });

  it('refuses a malformed body', async () => {
    const res = await request(app).post('/api/npcs').send({ race: 'dwarf', gender: 'OTHER' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['name', 'gender']));
  });

  it('only deletes the NPCs of the user', async () => {
    (prisma.npc.deleteMany as any).mockResolvedValue({ count: 0 });

    const res = await request(app).delete('/api/npcs/42');

    expect(res.status).toBe(404);
    expect(prisma.npc.deleteMany).toHaveBeenCalledWith({ where: { id: 42, userId: 1 } });
  });
});
