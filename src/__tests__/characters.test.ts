import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

// Authentification simulée : utilisateur 1
vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock de Prisma pour éviter de toucher à la vraie BDD
vi.mock('../prismaClient', () => ({
  default: {
    edition: { findUnique: vi.fn() },
    abilityScore: { findMany: vi.fn() },
    character: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const body = {
  name: 'Elandra',
  race: 'elf',
  abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  classes: [{ class: 'wizard', levels: [{ level: 1, characterLevel: 1 }] }],
};

describe('Character Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/characters', () => {
    it('should reject a malformed body with the path of each problem', async () => {
      const res = await request(app).post('/api/characters').send({ ...body, classes: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid character data');
      expect(res.body.errors).toEqual([expect.objectContaining({ path: 'classes' })]);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject content that does not exist in the edition', async () => {
      (prisma.edition.findUnique as any).mockResolvedValue(null);
      (prisma.abilityScore.findMany as any).mockResolvedValue([]);

      const res = await request(app).post('/api/characters').send({ ...body, edition: '1977' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: 'edition', message: 'Unknown edition "1977"' }]);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/characters/preview', () => {
    it('should reject a malformed character without touching the database', async () => {
      const res = await request(app).post('/api/characters/preview').send({ name: 'Elandra' });

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['race', 'abilityScores', 'classes']));
      expect(prisma.edition.findUnique).not.toHaveBeenCalled();
    });

    it('should report an unknown edition as an error of the preview', async () => {
      (prisma.edition.findUnique as any).mockResolvedValue(null);
      (prisma.abilityScore.findMany as any).mockResolvedValue([]);

      const res = await request(app).post('/api/characters/preview').send({ ...body, edition: '1977' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ valid: false, errors: [{ path: 'edition' }], choices: [] });
    });
  });

  describe('PUT /api/characters/:id', () => {
    it('should return 404 for a character of another user', async () => {
      (prisma.character.findFirst as any).mockResolvedValue(null);

      const res = await request(app).put('/api/characters/42').send(body);

      expect(res.status).toBe(404);
      expect(prisma.character.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42, userId: 1 } }));
    });
  });

  describe('DELETE /api/characters/:id', () => {
    it('should only delete the characters of the user', async () => {
      (prisma.character.deleteMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app).delete('/api/characters/42');

      expect(res.status).toBe(200);
      expect(prisma.character.deleteMany).toHaveBeenCalledWith({ where: { id: 42, userId: 1 } });
    });

    it('should return 404 when nothing was deleted', async () => {
      (prisma.character.deleteMany as any).mockResolvedValue({ count: 0 });

      const res = await request(app).delete('/api/characters/42');

      expect(res.status).toBe(404);
    });
  });

  describe('Sharing', () => {
    it("only lets the owner share a character, with a new code each time", async () => {
      (prisma.character.updateMany as any).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
      const first = (await request(app).post('/api/characters/7/share')).body.shareCode;
      const second = (await request(app).post('/api/characters/7/share')).body.shareCode;
      expect(first).not.toBe(second);
      expect((prisma.character.updateMany as any).mock.calls[0][0].where).toEqual({ id: 7, userId: 1 });
      expect((await request(app).post('/api/characters/8/share')).status).toBe(404);
    });

    it('stops sharing, and answers 404 for an unknown link', async () => {
      (prisma.character.updateMany as any).mockResolvedValue({ count: 1 });
      const res = await request(app).delete('/api/characters/7/share');
      expect(res.body).toEqual({ shareCode: null });
      (prisma.character.findUnique as any).mockResolvedValue(null);
      expect((await request(app).get('/api/characters/shared/inconnu')).status).toBe(404);
      expect((await request(app).post('/api/characters/shared/inconnu/copy')).status).toBe(404);
    });
  });
});
