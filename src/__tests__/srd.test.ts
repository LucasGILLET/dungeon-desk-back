import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

// Mock de Prisma pour éviter de toucher à la vraie BDD
vi.mock('../prismaClient', () => ({
  default: {
    locale: { findMany: vi.fn() },
    class: { findMany: vi.fn(), findFirst: vi.fn() },
    race: { findMany: vi.fn() },
    background: { findMany: vi.fn() },
    spell: { findMany: vi.fn() },
    equipment: { findFirst: vi.fn() },
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
  difficulty: 'HARD',
  recommendedAbilities: [{ abilityScore: { index: 'int', translations: tr({ name: 'Intelligence' }, { name: 'Intelligence' }) } }],
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
  subclasses: [{
    index: 'evocation',
    source: 'SRD',
    translations: tr({ name: 'School of Evocation', description: 'Evokers…' }, { name: "École d'évocation", description: 'Les évocateurs…' }),
    spells: [{ requiredClassLevel: 3, spell: { index: 'fireball', level: 3, translations: tr({ name: 'Fireball' }, { name: 'Boule de feu' }) } }],
  }],
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
        { index: 'barbarian', hitDie: 12, subclassLevel: 3, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: tr({ name: 'Barbarian' }, { name: 'Barbare' }) },
        { index: 'wizard', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=fr');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=3600');
      expect(res.body).toEqual([
        { index: 'barbarian', name: 'Barbare', lang: 'fr', hitDie: 12, subclassLevel: 3, difficulty: 'MEDIUM', casterType: null, recommendedAbilities: [] },
        { index: 'wizard', name: 'Magicien', lang: 'fr', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', casterType: null, recommendedAbilities: [] },
      ]);
      const query = (prisma.class.findMany as any).mock.calls[0][0];
      expect(query.where).toEqual({ edition: { code: '2014' } });
      expect(query.include.translations).toEqual({ orderBy: { localeCode: 'asc' } });
    });

    it("should fall back to the author's language for homebrew content", async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: [{ localeCode: 'fr', name: 'Magicien' }] },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=en');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Magicien', lang: 'fr' });
    });

    it('should use Accept-Language when no lang is given', async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes').set('Accept-Language', 'fr-FR,fr;q=0.9,en;q=0.8');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Magicien', lang: 'fr' });
    });

    it('should fall back to the default language for an unknown lang', async () => {
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) },
      ]);

      const res = await request(app).get('/api/srd/2014/classes?lang=de');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ name: 'Wizard', lang: 'en' });
    });

    it('should fall back to the default language, not the first translation found', async () => {
      // Traduction espagnole listée avant l'anglais, pas de français
      (prisma.class.findMany as any).mockResolvedValue([
        { index: 'wizard', hitDie: 6, subclassLevel: 2, difficulty: 'MEDIUM', recommendedAbilities: [], spellcasting: null, translations: [{ localeCode: 'es', name: 'Mago' }, { localeCode: 'en', name: 'Wizard' }] },
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
        subclasses: [{
          index: 'evocation', name: "École d'évocation", source: 'SRD', description: 'Les évocateurs…',
          spells: [{ index: 'fireball', name: 'Boule de feu', level: 3, requiredClassLevel: 3 }],
        }],
      });
      expect(res.body.features).toEqual([
        { index: 'arcane-recovery', level: 1, subclass: null, parent: null, name: 'Restauration arcanique', description: 'Vous avez appris…' },
        { index: 'sculpt-spells', level: 2, subclass: 'evocation', parent: null, name: 'Façonneur de sorts', description: 'À partir du niveau 2…' },
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

  describe('GET /api/srd/:edition/races', () => {
    it('should return races with translated subraces, traits and bonuses', async () => {
      const ability = { index: 'dex', translations: tr({ name: 'Dexterity' }, { name: 'Dextérité' }) };
      const darkvision = { trait: { index: 'darkvision', translations: tr({ name: 'Darkvision', description: 'You see…' }, { name: 'Vision dans le noir', description: 'Vous voyez…' }) } };
      (prisma.race.findMany as any).mockResolvedValue([{
        index: 'elf', source: 'SRD', sizes: ['MEDIUM'], speeds: { walk: 30 },
        translations: tr({ name: 'Elf', ageText: 'old', alignmentText: null, sizeText: null, languageText: null }, { name: 'Elfe', ageText: 'vieux', alignmentText: null, sizeText: null, languageText: null }),
        abilityBonus: [{ abilityScore: ability, bonus: 2 }],
        languages: [{ language: { index: 'elvish', translations: tr({ name: 'Elvish' }, { name: 'Elfique' }) } }],
        traits: [darkvision],
        choices: [], npcFrequency: 15, baseHeightCm: 160, heightVarianceCm: 20, baseWeightKg: 50, weightVarianceKg: 15,
        subraces: [{ index: 'wood-elf', source: 'HOMEBREW', translations: [{ localeCode: 'fr', name: 'Elfe des bois', description: null }], abilityBonus: [], traits: [] }],
      }]);

      const res = await request(app).get('/api/srd/2014/races?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({
        index: 'elf', name: 'Elfe', age: 'vieux', speeds: { walk: 30 },
        abilityBonuses: [{ index: 'dex', name: 'Dextérité', bonus: 2 }],
        languages: [{ index: 'elvish', name: 'Elfique' }],
        traits: [{ index: 'darkvision', name: 'Vision dans le noir', description: 'Vous voyez…' }],
        subraces: [{ index: 'wood-elf', name: 'Elfe des bois', source: 'HOMEBREW' }],
      });
      expect((prisma.race.findMany as any).mock.calls[0][0].where).toEqual({ edition: { code: '2014' } });
      expect(res.body[0]).toMatchObject({ abilityBonusChoice: null, npcProfile: { frequency: 15, heightCm: { base: 160, variance: 20 }, weightKg: { base: 50, variance: 15 } } });
    });
  });

  describe('GET /api/srd/:edition/backgrounds', () => {
    it('should return personality entries with their id', async () => {
      (prisma.background.findMany as any).mockResolvedValue([{
        index: 'acolyte', source: 'SRD',
        translations: tr({ name: 'Acolyte', featureName: 'Shelter', featureDescription: '…' }, { name: 'Acolyte', featureName: 'Abri du fidèle', featureDescription: '…' }),
        proficiencies: [], startingEquipment: [],
        personalityOptions: [{ id: 70, kind: 'IDEAL', position: 1, translations: tr({ text: 'Tradition.' }, { text: 'Tradition.' }), alignments: [] }],
      }]);

      const res = await request(app).get('/api/srd/2014/backgrounds?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ feature: { name: 'Abri du fidèle' }, personality: [{ id: 70, kind: 'IDEAL', text: 'Tradition.' }] });
    });
  });

  describe('GET /api/srd/:edition/spells', () => {
    it('should return structured spell fields', async () => {
      (prisma.spell.findMany as any).mockResolvedValue([{
        index: 'fireball', source: 'SRD', level: 3, castingTimeAmount: 1, castingTimeUnit: 'ACTION', ritual: false,
        rangeType: 'DISTANCE', rangeFt: 150, verbal: true, somatic: true, material: true, materialCostGp: null, materialConsumed: false,
        durationType: 'INSTANTANEOUS', durationAmount: null, concentration: false, attackType: null, saveSuccess: 'HALF', areaType: 'SPHERE', areaSizeFt: 20,
        translations: tr({ name: 'Fireball', description: 'A bright streak…', higherLevels: null, materialText: 'bat guano', castingTimeNote: null, rangeNote: null }, { name: 'Boule de feu', description: 'Un éclair…', higherLevels: null, materialText: 'guano', castingTimeNote: null, rangeNote: null }),
        school: { index: 'evocation', translations: tr({ name: 'Evocation' }, { name: 'Évocation' }) },
        saveAbility: { index: 'dex', translations: tr({ name: 'Dexterity' }, { name: 'Dextérité' }) },
        damageTypes: [], classes: [{ class: { index: 'wizard', translations: tr({ name: 'Wizard' }, { name: 'Magicien' }) } }], subclasses: [],
      }]);

      const res = await request(app).get('/api/srd/2014/spells?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({
        name: 'Boule de feu', level: 3, school: { name: 'Évocation' },
        range: { type: 'DISTANCE', feet: 150 }, components: { verbal: true, material: true, materialText: 'guano' },
        save: { ability: { index: 'dex' }, success: 'HALF' }, area: { type: 'SPHERE', sizeFt: 20 },
        classes: [{ index: 'wizard', name: 'Magicien' }],
      });
    });
  });

  describe('presentation of a class', () => {
    it('should expose difficulty and recommended abilities', async () => {
      (prisma.class.findFirst as any).mockResolvedValue(wizard);

      const res = await request(app).get('/api/srd/2014/classes/wizard?lang=fr');

      expect(res.body).toMatchObject({ difficulty: 'HARD', recommendedAbilities: [{ index: 'int', name: 'Intelligence' }] });
    });
  });

  describe('GET /api/srd/:edition/equipment/:index', () => {
    it('should return the weapon stats with the rule of each property', async () => {
      (prisma.equipment.findFirst as any).mockResolvedValue({
        index: 'greatsword', kind: 'WEAPON', source: 'SRD', costAmount: 50, costCurrency: 'GP', weightLb: '6.00',
        translations: tr({ name: 'Greatsword', description: null }, { name: 'Épée à deux mains', description: null }),
        categories: [{ category: { index: 'martial-weapons', translations: tr({ name: 'Martial Weapons' }, { name: 'Armes de guerre' }) } }],
        weapon: {
          category: 'MARTIAL', range: 'MELEE', damageDice: '2d6', versatileDice: null, normalRangeFt: null, longRangeFt: null,
          damageType: { index: 'slashing', translations: tr({ name: 'Slashing' }, { name: 'Tranchant' }) },
          properties: [{ property: { index: 'heavy', translations: tr({ name: 'Heavy', description: 'Small creatures…' }, { name: 'Lourde', description: 'Les petites créatures…' }) } }],
        },
        armor: null,
      });

      const res = await request(app).get('/api/srd/2014/equipment/greatsword?lang=fr');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Épée à deux mains', cost: { amount: 50, currency: 'GP' }, weightLb: 6,
        categories: [{ index: 'martial-weapons', name: 'Armes de guerre' }],
        weapon: { damage: '2d6', damageType: { name: 'Tranchant' }, properties: [{ index: 'heavy', name: 'Lourde', description: 'Les petites créatures…' }] },
        armor: null,
      });
    });

    it('should return 404 for unknown equipment', async () => {
      (prisma.equipment.findFirst as any).mockResolvedValue(null);
      expect((await request(app).get('/api/srd/2014/equipment/lightsaber')).status).toBe(404);
    });
  });
});
