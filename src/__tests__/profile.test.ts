import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../app';
import prisma from '../prismaClient';

vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../prismaClient', () => ({
  default: { user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
}));

const profile = { id: 1, username: 'Elminster', email: 'elminster@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.user.findFirst as any).mockResolvedValue(null);
  (prisma.user.update as any).mockImplementation(async ({ data }: any) => ({ ...profile, ...data }));
});

describe('Profile', () => {
  it('returns the profile of the current user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(profile);

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(profile);
    expect((prisma.user.findUnique as any).mock.calls[0][0].where).toEqual({ id: 1 });
  });

  it('changes the username, tidying its spaces', async () => {
    const res = await request(app).patch('/api/me').send({ username: '  Mordenkainen   le  Sage ' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('Mordenkainen le Sage');
    expect((prisma.user.update as any).mock.calls[0][0]).toMatchObject({ where: { id: 1 }, data: { username: 'Mordenkainen le Sage' } });
  });

  it('refuses a username taken by someone else, whatever its case', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ id: 2 });

    const res = await request(app).patch('/api/me').send({ username: 'gandalf' });

    expect(res.status).toBe(409);
    expect((prisma.user.findFirst as any).mock.calls[0][0].where).toEqual({ username: { equals: 'gandalf', mode: 'insensitive' }, NOT: { id: 1 } });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('answers 409 when the username is taken at the same moment', async () => {
    (prisma.user.update as any).mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'x' }));

    const res = await request(app).patch('/api/me').send({ username: 'Gandalf' });

    expect(res.status).toBe(409);
  });

  it.each([
    ['too short', 'Al'],
    ['too long', 'x'.repeat(31)],
    ['forbidden characters', '<script>'],
    ['blank', '     '],
  ])('refuses a %s username', async (_case, username) => {
    const res = await request(app).patch('/api/me').send({ username });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe('username');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('accepts accents and apostrophes', async () => {
    const res = await request(app).patch('/api/me').send({ username: "Éléa d'Eauprofonde" });

    expect(res.status).toBe(200);
  });
});
