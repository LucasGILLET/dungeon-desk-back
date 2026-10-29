import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

vi.mock('../prismaClient', () => ({
  default: { locale: { findMany: vi.fn() }, $queryRawUnsafe: vi.fn() },
}));

const row = (kind: string, index: string, name: string, score: number, matched = name) =>
  ({ kind, index, name, matched, detail: null, text: null, score });

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.locale.findMany as any).mockResolvedValue([
    { code: 'en', name: 'English', isDefault: true, position: 1 },
    { code: 'fr', name: 'Français', isDefault: false, position: 2 },
  ]);
  (prisma.$queryRawUnsafe as any).mockResolvedValue([]);
});

describe('Global search', () => {
  it('searches the edition in the requested language, with the default language as fallback', async () => {
    (prisma.$queryRawUnsafe as any).mockResolvedValue([row('spell', 'fireball', 'Boule de feu', 1, 'Fireball')]);

    const res = await request(app).get('/api/srd/2014/search?q=fireball&lang=fr');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ kind: 'spell', index: 'fireball', name: 'Boule de feu', matched: 'Fireball', detail: null, text: null, score: 1 }]);
    expect((prisma.$queryRawUnsafe as any).mock.calls[0].slice(1)).toEqual(['fireball', '2014', 'fr', 'en']);
  });

  it('keeps the best 8 results of each kind', async () => {
    (prisma.$queryRawUnsafe as any).mockResolvedValue([
      ...Array.from({ length: 10 }, (_, i) => row('magic-item', `item-${i}`, `Objet ${i}`, 0.9)),
      row('spell', 'light', 'Lumière', 0.8),
    ]);

    const res = await request(app).get('/api/srd/2014/search?q=objet');

    expect(res.body.filter((r: any) => r.kind === 'magic-item')).toHaveLength(8);
    expect(res.body.at(-1).index).toBe('light');
  });

  it('only shows the other-language name when it contains the search', async () => {
    (prisma.$queryRawUnsafe as any).mockResolvedValue([
      row('magic-item', 'dragon-scale-mail', "Armure d'écailles de dragon", 0.56, 'Dragon Scale Mail'),
      row('spell', 'vampiric-touch', 'Toucher du vampire', 0.3, 'Vampiric Touch'),
    ]);

    const res = await request(app).get('/api/srd/2014/search?q=dragon rouge');

    expect(res.body.map((r: any) => r.matched)).toEqual([null, null]);
  });

  it('ignores searches that are too short, and LIKE wildcards', async () => {
    const short = await request(app).get('/api/srd/2014/search?q=%25');
    expect(short.body).toEqual([]);
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();

    await request(app).get(`/api/srd/2014/search?q=${encodeURIComponent('  épée_%longue ')}`);
    expect((prisma.$queryRawUnsafe as any).mock.calls[0][1]).toBe('épée longue');
  });
});
