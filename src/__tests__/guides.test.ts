import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn() },
    guidePage: { findMany: vi.fn(), findFirst: vi.fn() },
    ruleSection: { findFirst: vi.fn() },
  },
}));

const LOCALES = [
  { code: 'en', name: 'English', isDefault: true, position: 1 },
  { code: 'fr', name: 'Français', isDefault: false, position: 2 },
];
const fr = (data: Record<string, unknown>) => [{ localeCode: 'fr', ...data }];

const cheatSheet = {
  index: 'combat-cheat-sheet', published: true, icon: '⚔️', accent: 'YELLOW',
  translations: fr({ title: 'Aide combat', shortTitle: 'Combat', eyebrow: 'Aide-mémoire', heading: 'Combat', intro: null }),
  sections: [{
    index: 'action', icon: '⚔️', accent: 'EMERALD',
    translations: fr({ title: 'Action', subtitle: 'Action principale', body: 'Choisis **une seule** option.' }),
    cards: [{
      index: 'attack', icon: '⚔️', accent: null,
      translations: fr({ title: 'Attaquer', eyebrow: null, summary: 'Voir le détail.', advice: null }),
      class: null, race: null,
      ruleSection: { index: 'making-an-attack', translations: fr({ name: 'Effectuer une attaque' }) },
      detailSection: { index: 'attack-sequence' },
      lists: [{ translations: fr({ label: 'À savoir', items: 'Un\n\n  Deux  \n' }) }],
    }],
  }],
};

describe('Guides and rules', () => {
  beforeEach(() => {
    vi.mocked(prisma.locale.findMany).mockResolvedValue(LOCALES as never);
  });

  it('returns a guide page with its sections, cards and links', async () => {
    vi.mocked(prisma.guidePage.findFirst).mockResolvedValue(cheatSheet as never);
    const res = await request(app).get('/api/srd/2014/guides/combat-cheat-sheet?lang=fr');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ index: 'combat-cheat-sheet', title: 'Aide combat', lang: 'fr' });
    expect(res.body.sections[0]).toMatchObject({ index: 'action', subtitle: 'Action principale' });
    expect(res.body.sections[0].cards[0]).toMatchObject({
      index: 'attack',
      detail: 'attack-sequence',
      rule: { index: 'making-an-attack', name: 'Effectuer une attaque' },
      lists: [{ label: 'À savoir', items: ['Un', 'Deux'] }],
    });
  });

  it('returns 404 for an unknown guide or rule section', async () => {
    vi.mocked(prisma.guidePage.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.ruleSection.findFirst).mockResolvedValue(null);
    expect((await request(app).get('/api/srd/2014/guides/nope')).status).toBe(404);
    expect((await request(app).get('/api/srd/2014/rule-sections/nope')).status).toBe(404);
  });
});
