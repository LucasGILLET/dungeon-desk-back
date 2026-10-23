import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

// Utilisateur connecté : id 1
vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

const ref = (index: string) => ({ id: index.length, index });
vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn().mockResolvedValue([{ code: 'en', isDefault: true }, { code: 'fr', isDefault: false }]) },
    edition: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
    monster: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    creatureType: { findMany: vi.fn() },
    alignment: { findMany: vi.fn() },
    abilityScore: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
    damageType: { findMany: vi.fn() },
    condition: { findMany: vi.fn() },
  },
}));

const goblin = {
  name: 'Gobelin des marais',
  size: 'SMALL',
  type: 'humanoid',
  alignment: 'neutral-evil',
  armorClass: { value: 13, note: 'armure de joncs' },
  hitDice: { count: 3, size: 6, bonus: 0 },
  speeds: { walk: 30, swim: 20 },
  abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  skills: [{ skill: 'stealth', bonus: 6 }],
  damageResistances: ['poison'],
  challengeRating: 0.5,
  actions: [{ name: 'Cimeterre', description: 'Attaque au corps à corps.', attack: { type: 'MELEE_WEAPON', bonus: 4, reachFt: 5 }, damages: [{ dice: '1d6+2', damageType: 'slashing' }] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Toutes les références existent, sauf indication contraire
  for (const model of ['creatureType', 'alignment', 'abilityScore', 'skill', 'damageType', 'condition'] as const) {
    (prisma[model].findMany as any).mockImplementation(async ({ where }: any) => {
      const wanted = where.index?.in ?? [where.index];
      return wanted.filter((i: string) => i && i !== 'unknown-type').map(ref);
    });
  }
});

describe('Homebrew monsters', () => {
  it('keeps homebrew monsters out of the public SRD bestiary', async () => {
    (prisma.monster.findMany as any).mockResolvedValue([]);
    await request(app).get('/api/srd/2014/monsters');
    expect((prisma.monster.findMany as any).mock.calls[0][0].where).toMatchObject({ ownerId: null });
  });

  it('lists only the monsters of the user', async () => {
    (prisma.monster.findMany as any).mockResolvedValue([]);
    await request(app).get('/api/monsters');
    expect((prisma.monster.findMany as any).mock.calls[0][0].where).toEqual({ ownerId: 1, source: 'HOMEBREW' });
  });

  it('creates a monster with derived hit points, passive perception and XP', async () => {
    (prisma.monster.create as any).mockResolvedValue({ index: 'gobelin-des-marais-abc123' });

    const res = await request(app).post('/api/monsters?lang=fr').send(goblin);

    expect(res.status).toBe(201);
    const data = (prisma.monster.create as any).mock.calls[0][0].data;
    expect(data).toMatchObject({
      ownerId: 1, source: 'HOMEBREW', editionId: 1, size: 'SMALL', isUnaligned: false,
      hitPoints: 10, passivePerception: 9, xp: 100, challengeRating: 0.5, legendaryActionsPerRound: null,
    });
    expect(data.index).toMatch(/^gobelin-des-marais-[0-9a-f]{6}$/);
    expect(data.translations.create).toEqual([{ localeCode: 'fr', name: 'Gobelin des marais', description: null, languagesText: null }]);
    expect(data.actions.create[0]).toMatchObject({ kind: 'ACTION', attackType: 'MELEE_WEAPON', attackBonus: 4, reachFt: 5, saveAbilityId: null, saveDc: null });
    expect(data.actions.create[0].damages.create).toEqual([{ position: 0, dice: '1d6+2', damageTypeId: 'slashing'.length }]);
    expect(data.damageModifiers.create).toEqual([{ kind: 'RESISTANCE', damageTypeId: 'poison'.length, nonMagicalOnly: false }]);
  });

  it('keeps resistances to non-magical attacks only, and lair actions', async () => {
    (prisma.monster.create as any).mockResolvedValue({ index: 'golem-abc123' });
    await request(app).post('/api/monsters').send({
      ...goblin,
      damageResistances: [{ damageType: 'slashing', nonMagicalOnly: true }, 'poison'],
      lairActions: [{ name: 'Éboulement', description: 'Des pierres tombent.', save: { ability: 'dex', dc: 13 }, damages: [{ dice: '2d6', damageType: 'bludgeoning' }] }],
    });
    const data = (prisma.monster.create as any).mock.calls[0][0].data;
    expect(data.damageModifiers.create).toEqual([
      { kind: 'RESISTANCE', damageTypeId: 'slashing'.length, nonMagicalOnly: true },
      { kind: 'RESISTANCE', damageTypeId: 'poison'.length, nonMagicalOnly: false },
    ]);
    expect(data.actions.create.at(-1)).toMatchObject({ kind: 'LAIR', saveDc: 13, legendaryCost: null });
  });

  it('refuses stats outside the bounds of the database and unknown references', async () => {
    const outOfBounds = await request(app).post('/api/monsters').send({ ...goblin, hitDice: { count: 3, size: 7 }, challengeRating: 0.3 });
    expect(outOfBounds.status).toBe(400);
    expect(outOfBounds.body.errors.map((e: any) => e.path)).toEqual(expect.arrayContaining(['hitDice.size', 'challengeRating']));

    const unknown = await request(app).post('/api/monsters').send({ ...goblin, type: 'unknown-type' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.errors).toEqual([{ path: 'type', message: 'Unknown "unknown-type"' }]);
    expect(prisma.monster.create).not.toHaveBeenCalled();
  });

  it("returns 404 for another user's monster and 409 when deleting a monster used in an encounter", async () => {
    (prisma.monster.findFirst as any).mockResolvedValueOnce(null);
    expect((await request(app).get('/api/monsters/autre-ogre')).status).toBe(404);
    expect((prisma.monster.findFirst as any).mock.calls[0][0].where).toMatchObject({ ownerId: 1, index: 'autre-ogre' });

    (prisma.monster.findFirst as any).mockResolvedValueOnce({ id: 4, _count: { encounterMonsters: 2, combatants: 0 } });
    expect((await request(app).delete('/api/monsters/gobelin')).body).toMatchObject({ reason: 'ENCOUNTER' });
    // Dans un combat en cours seulement (ajouté à la volée) : refusé aussi
    (prisma.monster.findFirst as any).mockResolvedValueOnce({ id: 4, _count: { encounterMonsters: 0, combatants: 1 } });
    const inCombat = await request(app).delete('/api/monsters/gobelin');
    expect(inCombat.status).toBe(409);
    expect(inCombat.body).toMatchObject({ reason: 'COMBAT' });
    expect((prisma.monster.findFirst as any).mock.calls.at(-1)[0].select._count.select.combatants).toEqual({ where: { combat: { finished: false } } });
    expect(prisma.monster.delete).not.toHaveBeenCalled();
  });
});
