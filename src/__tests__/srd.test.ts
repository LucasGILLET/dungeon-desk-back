import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

// Mock de Prisma pour éviter de toucher à la vraie BDD
vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn() },
    class: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

const LOCALES = [
  { code: 'en', name: 'English', isDefault: true, position: 1 },
  { code: 'fr', name: 'Français', isDefault: false, position: 2 },
];

// Traductions anglaise et française d'un champ
const tr = (en: Record<string, unknown>, fr?: Record<string, unknown>) => [
  { localeCode: 'en', ...en },
  ...(fr ? [{ localeCode: 'fr', ...fr }] : []),
];

// Magicien réduit, au format renvoyé par prisma.class.findFirst (include)
const wizard = {
  index: 'wizard',
  hitDie: 6,
  subclassLevel: 2,
  translations: tr({ name: 'Wizard', subclassLabel: 'Arcane Tradition' }, { name: 'Magicien', subclassLabel: 'Tradition arcanique' }),
  savingThrows: [{ abilityScore: { index: 'int', translations: tr({ name: 'Intelligence' }, { name: 'Intelligence' }) } }],
  proficiencies: [{ proficiency: { index: 'daggers', translations: tr({ name: 'Daggers' }, { name: 'Dagues' }) } }],
  startingEquipment: [{ quantity: 1, equipment: { index: 'spellbook', translations: tr({ name: 'Spellbook' }, { name: 'Grimoire' }) } }],
  choices: [
    {
      kind: 'STARTING_EQUIPMENT',
      choose: 1,
      pool: null,
      poolCategory: null,
      // Description non traduite : repli sur l'anglais
      translations: tr({ description: '(a) a component pouch or (b) an arcane focus' }),
      options: [
        {
          items: [{ quantity: 1, proficiency: null, equipmentCategory: null, equipment: { index: 'component-pouch', translations: tr({ name: 'Component pouch' }, { name: 'Sacoche à composantes' }) } }],
          nestedChoice: null,
        },
        {
          items: [],
          nestedChoice: {
            choose: 1,
            translations: tr({ description: 'arcane focus' }),
            poolCategory: { index: 'arcane-foci', translations: tr({ name: 'Arcane Foci' }, { name: 'Focaliseurs arcaniques' }) },
          },
        },
      ],
    },
  ],
  tableColumns: [
    { id: 10, key: 'arcane_recovery_levels', valueType: 'INTEGER', translations: tr({ label: 'Arcane Recovery Levels' }, { label: 'Niveaux de restauration arcanique' }) },
    { id: 11, key: 'sneak_attack', valueType: 'DICE', translations: tr({ label: 'Sneak Attack' }) },
  ],
  levels: [
    {
      level: 1,
      abilityScoreImprovements: 0,
      cantripsKnown: 3,
      spellsKnown: null,
      spellSlots: [{ spellLevel: 1, slots: 2 }],
      values: [
        { columnId: 10, intValue: 1, boolValue: null, diceCount: null, diceValue: null },
        { columnId: 11, intValue: null, boolValue: null, diceCount: 1, diceValue: 6 },
      ],
    },
  ],
  spellcasting: {
    startLevel: 1,
    casterType: 'FULL',
    ritualCasting: true,
    abilityScore: { index: 'int', translations: tr({ name: 'Intelligence' }, { name: 'Intelligence' }) },
    sections: [{ translations: tr({ title: 'Cantrips', description: 'At 1st level…' }) }],
  },
  subclasses: [{ index: 'evocation', translations: tr({ name: 'School of Evocation' }, { name: "École d'évocation" }) }],
  features: [
    { index: 'arcane-recovery', level: 1, subclass: null, translations: tr({ name: 'Arcane Recovery', description: 'You have learned…' }, { name: 'Restauration arcanique', description: 'Vous avez appris…' }) },
    { index: 'sculpt-spells', level: 2, subclass: { index: 'evocation' }, translations: tr({ name: 'Sculpt Spells', description: 'Beginning at 2nd level…' }, { name: 'Façonneur de sorts', description: 'À partir du niveau 2…' }) },
  ],
  _count: { spells: 204 },
};

describe('SRD Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.locale.findMany as any).mockResolvedValue(LOCALES);
  });

  describe('GET /api/srd/:edition/classes', () => {
    it('should list the classes of the edition with their translated name', async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'barbarian', hitDie: 12, subclassLevel: 3, translations: tr({ name: 'Barbarian' }, { name: 'Barbare' }) },
        { index: 'wizard', hitDie: 6, subclassLevel: 2, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=fr');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=3600');
      expect(res.body).toEqual([
        { index: 'barbarian', name: 'Barbare', lang: 'fr', hitDie: 12, subclassLevel: 3 },
        { index: 'wizard', name: 'Magicien', lang: 'fr', hitDie: 6, subclassLevel: 2 },
      ]);
      const query = (prisma.class.findMany as any).mock.calls[0][0];
      expect(query.where).toEqual({ edition: { code: '2014' } });
      // Seules la langue demandée et la langue de repli sont chargées
      expect(query.include.translations.where.localeCode.in).toEqual(['fr', 'en']);
    });

    it('should use Accept-Language when no lang is given', async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes').set('Accept-Language', 'fr-FR,fr;q=0.9,en;q=0.8');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Magicien', lang: 'fr' });
    });

    it('should fall back to the default language for an unknown lang', async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=de');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Wizard', lang: 'en' });
    });

    it('should fall back to the default language, not the first translation found', async () => {
      // Traduction espagnole listée avant l'anglais, pas de français
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, translations: [{ localeCode: 'es', name: 'Mago' }, { localeCode: 'en', name: 'Wizard' }] },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Wizard', lang: 'en' });
    });

    it('should return 500 if the database fails', async () => {
      (prisma.class.findMany as any).mockRejectedValue(new Error('connection lost'));

      const res = await request(app).get('/api/srd/2014/classes?lang=fr');

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
  });

  describe('GET /api/srd/:edition/classes/:index', () => {
    it('should return the class with flattened translations', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(wizard);

      const res = await request(app).get('/api/srd/2014/classes/wizard?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        index: 'wizard',
        edition: '2014',
        lang: 'fr',
        name: 'Magicien',
        hitDie: 6,
        subclassLevel: 2,
        subclassLabel: 'Tradition arcanique',
        savingThrows: [{ index: 'int', name: 'Intelligence' }],
        proficiencies: [{ index: 'daggers', name: 'Dagues' }],
        startingEquipment: [{ index: 'spellbook', name: 'Grimoire', quantity: 1 }],
        subclasses: [{ index: 'evocation', name: "École d'évocation" }],
      });
      expect(res.body.features).toEqual([
        { index: 'arcane-recovery', level: 1, subclass: null, name: 'Restauration arcanique', description: 'Vous avez appris…' },
        { index: 'sculpt-spells', level: 2, subclass: 'evocation', name: 'Façonneur de sorts', description: 'À partir du niveau 2…' },
      ]);
      const query = (prisma.class.findFirst as any).mock.calls[0][0];
      expect(query.where).toEqual({ index: 'wizard', edition: { code: '2014' } });
    });

    it('should return choices with their items and nested category choice', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(wizard);

      const res = await request(app).get('/api/srd/2014/classes/wizard?lang=fr');

      const [choice] = res.body.choices;
      expect(choice).toMatchObject({ kind: 'STARTING_EQUIPMENT', choose: 1, pool: null });
      // Non traduite en français : repli sur l'anglais
      expect(choice.description).toBe('(a) a component pouch or (b) an arcane focus');
      expect(choice.options[0].items).toEqual([{ index: 'component-pouch', name: 'Sacoche à composantes', quantity: 1, isCategory: false }]);
      expect(choice.options[1].choice).toEqual({
        choose: 1,
        description: 'arcane focus',
        category: { index: 'arcane-foci', name: 'Focaliseurs arcaniques' },
      });
    });

    it('should return the progression table with integer and dice values', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(wizard);

      const res = await request(app).get('/api/srd/2014/classes/wizard?lang=fr');

      expect(res.body.table.columns).toEqual([
        { key: 'arcane_recovery_levels', label: 'Niveaux de restauration arcanique', type: 'INTEGER' },
        { key: 'sneak_attack', label: 'Sneak Attack', type: 'DICE' },
      ]);
      expect(res.body.table.levels).toEqual([
        {
          level: 1,
          abilityScoreImprovements: 0,
          cantripsKnown: 3,
          spellsKnown: null,
          spellSlots: [2],
          values: { arcane_recovery_levels: 1, sneak_attack: '1d6' },
        },
      ]);
    });

    it('should mark the language actually used for untranslated spellcasting sections', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(wizard);

      const res = await request(app).get('/api/srd/2014/classes/wizard?lang=fr');

      expect(res.body.spellcasting).toEqual({
        ability: { index: 'int', name: 'Intelligence' },
        startLevel: 1,
        casterType: 'FULL',
        ritualCasting: true,
        sections: [{ title: 'Cantrips', description: 'At 1st level…', lang: 'en' }],
        spellCount: 204,
      });
    });

    it('should return null spellcasting for a class without spells', async () => {
      (prisma.class.findFirst as any).mockResolvedValue({ ...wizard, index: 'barbarian', spellcasting: null });

      const res = await request(app).get('/api/srd/2014/classes/barbarian?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body.spellcasting).toBeNull();
    });

    it('should return 404 if the class does not exist', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(null);

      const res = await request(app).get('/api/srd/2014/classes/licorne');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Class not found');
    });

    it('should return 500 if the database fails', async () => {
      (prisma.class.findFirst as any).mockRejectedValue(new Error('connection lost'));

      const res = await request(app).get('/api/srd/2014/classes/wizard');

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
  });
});
