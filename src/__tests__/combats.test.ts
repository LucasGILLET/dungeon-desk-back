import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';
import { healthLabel } from '../campaigns/combat';

vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn().mockResolvedValue([{ code: 'en', isDefault: true }, { code: 'fr', isDefault: false }]) },
    campaign: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    combat: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    combatant: { deleteMany: vi.fn() },
    monster: { findMany: vi.fn() },
    condition: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const combatant = (over: object) => ({
  id: 1, kind: 'CHARACTER', name: 'Bram', initiative: 15, conditions: [], hitPoints: 20, maxHitPoints: 30, tempHitPoints: 0, hidden: false, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('Combat', () => {
  it('describes the health of a creature without its hit points', () => {
    expect(healthLabel(40, 40)).toBe('UNHURT');
    expect(healthLabel(25, 40)).toBe('HURT');
    expect(healthLabel(20, 40)).toBe('BLOODIED');
    expect(healthLabel(0, 40)).toBe('DOWN');
    expect(healthLabel(null, 40)).toBeNull();
  });

  it("shows the players the party's hit points, only the health of monsters, and hides hidden creatures", async () => {
    (prisma.combat.findUnique as any).mockResolvedValue({
      name: 'Embuscade', round: 2, turn: 1, finished: false, updatedAt: '', campaign: { name: 'La mine perdue' },
      combatants: [
        combatant({ id: 1 }),
        combatant({ id: 2, kind: 'MONSTER', name: 'Gobelin 1', initiative: 12, hitPoints: 3, maxHitPoints: 7, conditions: ['prone'] }),
        combatant({ id: 3, kind: 'MONSTER', name: 'Ogre caché', initiative: 8, hidden: true }),
      ],
    });

    const res = await request(app).get('/api/combat-view/abc');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ round: 2, currentId: 2, campaign: 'La mine perdue' });
    expect(res.body.combatants).toEqual([
      expect.objectContaining({ id: 1, hitPoints: 20, maxHitPoints: 30, health: 'HURT' }),
      expect.objectContaining({ id: 2, name: 'Gobelin 1', hitPoints: null, maxHitPoints: null, health: 'BLOODIED', conditions: ['prone'] }),
    ]);
    expect(JSON.stringify(res.body)).not.toContain('Ogre');
  });

  it("does not show whose turn it is when it is a hidden creature's", async () => {
    (prisma.combat.findUnique as any).mockResolvedValue({
      name: 'Embuscade', round: 1, turn: 1, finished: false, updatedAt: '', campaign: { name: 'C' },
      combatants: [combatant({ id: 1 }), combatant({ id: 3, kind: 'MONSTER', hidden: true })],
    });
    expect((await request(app).get('/api/combat-view/abc')).body.currentId).toBeNull();
  });

  it('refuses a character outside the party and an unknown condition', async () => {
    (prisma.campaign.findUnique as any).mockResolvedValue({ userId: 1, editionId: 1, members: [] });
    (prisma.combat.findFirst as any).mockResolvedValue({ id: 3 });
    (prisma.campaign.findUniqueOrThrow as any).mockResolvedValue({ members: [{ characterId: 9 }], gmCharacters: [] });
    (prisma.monster.findMany as any).mockResolvedValue([]);
    (prisma.condition.findMany as any).mockResolvedValue([{ index: 'prone' }]);

    const res = await request(app).put('/api/campaigns/5/combats/3').send({
      name: 'Embuscade', round: 1, turn: 0,
      combatants: [
        { kind: 'CHARACTER', characterId: 9, name: 'Bram', conditions: ['prone'] },
        { kind: 'CHARACTER', characterId: 42, name: 'Intrus', conditions: ['flying'] },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { path: 'combatants[1].characterId', message: 'Character not in the party' },
      { path: 'combatants[1].conditions', message: 'Unknown condition "flying"' },
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
