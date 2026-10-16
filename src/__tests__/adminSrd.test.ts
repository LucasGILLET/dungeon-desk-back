import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';

// Utilisateur simulé : le rôle est lu dans l'en-tête X-Test-Role (USER par défaut)
vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 4, email: 'mj@example.com', username: 'mj', role: req.headers['x-test-role'] ?? 'USER' };
    next();
  },
}));

// Mock de Prisma pour éviter de toucher à la vraie BDD
vi.mock('../prismaClient', () => {
  const tx = {
    class: { update: vi.fn() },
    classTranslation: { upsert: vi.fn() },
    classFeatureTranslation: { upsert: vi.fn() },
  };
  return {
    default: {
      class: { findFirst: vi.fn(), findMany: vi.fn() },
      locale: { findMany: vi.fn(), findUnique: vi.fn() },
      choiceTranslation: { upsert: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
      __tx: tx,
    },
  };
});

const db = prisma as any;
const tx = db.__tx;

const tr = (localeCode: string, data: Record<string, unknown>) => ({ localeCode, ...data });

const wizard = {
  id: 12,
  index: 'wizard',
  hitDie: 6,
  subclassLevel: 2,
  source: 'SRD',
  translations: [tr('en', { name: 'Wizard', subclassLabel: 'Arcane Tradition', description: null }), tr('fr', { name: 'Magicien', subclassLabel: 'Tradition arcanique', description: null })],
  subclasses: [{ id: 3, index: 'evocation', translations: [tr('en', { name: 'Evocation', description: null })] }],
  features: [
    { id: 100, index: 'arcane-recovery', level: 1, subclass: null, translations: [tr('en', { name: 'Arcane Recovery', description: 'You have learned to regain some of your magical energy.' })] },
  ],
};

// Données pour la page « Traductions à faire »
const wizardTexts = {
  ...wizard,
  tableColumns: [],
  spellcasting: { sections: [{ id: 7, translations: [tr('en', { title: 'Cantrips', description: 'At 1st level, you know three cantrips.' })] }] },
  choices: [{ id: 9, translations: [tr('en', { description: 'Choose two from Arcana, History, Insight…' }), tr('fr', { description: 'Choose two from Arcana, History, Insight…' })] }],
  features: [
    { id: 100, level: 1, translations: [tr('en', { name: 'Arcane Recovery', description: 'You have learned to regain some energy.' }), tr('fr', { name: 'Restauration arcanique', description: "Vous avez appris à regagner de l'énergie." })] },
  ],
};

const asRole = (role: string) => ({ 'X-Test-Role': role });

describe('Admin SRD Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.locale.findMany.mockResolvedValue([{ code: 'en' }, { code: 'fr' }]);
    db.locale.findUnique.mockImplementation(async ({ where }: any) => (['en', 'fr'].includes(where.code) ? { code: where.code } : null));
  });

  describe('access', () => {
    it('should return the current user and its role', async () => {
      const res = await request(app).get('/api/admin/me').set(asRole('EDITOR'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 4, email: 'mj@example.com', username: 'mj', role: 'EDITOR' });
    });

    it('should refuse back-office routes to a player', async () => {
      const res = await request(app).get('/api/admin/2014/classes').set(asRole('USER'));

      expect(res.status).toBe(403);
      expect(db.class.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/:edition/classes/:index', () => {
    it('should return the class with its texts grouped by language', async () => {
      db.class.findFirst.mockResolvedValue(wizard);

      const res = await request(app).get('/api/admin/2014/classes/wizard').set(asRole('TRANSLATOR'));

      expect(res.status).toBe(200);
      expect(res.body.translations).toEqual({
        en: { name: 'Wizard', subclassLabel: 'Arcane Tradition', description: null },
        fr: { name: 'Magicien', subclassLabel: 'Tradition arcanique', description: null },
      });
      expect(res.body.features[0]).toMatchObject({ id: 100, level: 1, subclass: null, translations: { en: { name: 'Arcane Recovery' } } });
    });

    it('should return 404 for an unknown class', async () => {
      db.class.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/admin/2014/classes/licorne').set(asRole('ADMIN'));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/admin/:edition/classes/:index', () => {
    it('should save class fields, translations and feature translations in one transaction', async () => {
      db.class.findFirst.mockResolvedValue(wizard);

      const res = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('EDITOR')).send({
        hitDie: 8,
        translations: { fr: { name: 'Magicien', subclassLabel: 'Tradition arcanique' } },
        features: [{ id: 100, translations: { fr: { name: 'Restauration arcanique', description: 'Vous regagnez…' } } }],
      });

      expect(res.status).toBe(200);
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.class.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { hitDie: 8, subclassLevel: undefined } });
      expect(tx.classTranslation.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { classId_localeCode: { classId: 12, localeCode: 'fr' } },
      }));
      expect(tx.classFeatureTranslation.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { classFeatureId_localeCode: { classFeatureId: 100, localeCode: 'fr' } },
        update: { name: 'Restauration arcanique', description: 'Vous regagnez…' },
      }));
    });

    it('should let a translator save texts but not class fields', async () => {
      db.class.findFirst.mockResolvedValue(wizard);

      const texts = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('TRANSLATOR'))
        .send({ translations: { fr: { name: 'Magicien', subclassLabel: 'Tradition arcanique' } } });
      const fields = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('TRANSLATOR')).send({ hitDie: 8 });

      expect(texts.status).toBe(200);
      expect(fields.status).toBe(403);
      expect(tx.class.update).not.toHaveBeenCalled();
    });

    it('should reject invalid data', async () => {
      const res = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('EDITOR'))
        .send({ hitDie: 7, translations: { fr: { name: '', subclassLabel: 'x' } } });

      expect(res.status).toBe(400);
      expect(res.body.errors.hitDie).toBeDefined();
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('should reject an unknown language', async () => {
      db.class.findFirst.mockResolvedValue(wizard);

      const res = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('EDITOR'))
        .send({ translations: { de: { name: 'Magier', subclassLabel: 'Arkane Tradition' } } });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('de');
    });

    it('should reject a feature that belongs to another class', async () => {
      db.class.findFirst.mockResolvedValue(wizard);

      const res = await request(app).put('/api/admin/2014/classes/wizard').set(asRole('EDITOR'))
        .send({ features: [{ id: 999, translations: { fr: { name: 'Rage', description: 'Au combat…' } } }] });

      expect(res.status).toBe(400);
      expect(res.body.ids).toEqual([999]);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('translations to do', () => {
    it('should list missing texts and texts identical to English', async () => {
      db.class.findMany.mockResolvedValue([wizardTexts]);

      const res = await request(app).get('/api/admin/2014/translations?locale=fr').set(asRole('TRANSLATOR'));

      expect(res.status).toBe(200);
      const byEntity = Object.fromEntries(res.body.items.map((i: any) => [i.entity, i.status]));
      // Sous-classe et rubrique d'incantation sans français ; choix recopié de l'anglais
      expect(byEntity).toEqual({ subclass: 'missing', spellcastingSection: 'missing', choice: 'identical' });
      expect(res.body).toMatchObject({ locale: 'fr', total: 5, todo: 3 });
    });

    it('should save one translation with its required fields', async () => {
      db.choiceTranslation.upsert.mockResolvedValue({ choiceId: 9, localeCode: 'fr', description: 'Choisissez deux compétences…' });

      const res = await request(app).put('/api/admin/translations/choice/9/fr').set(asRole('TRANSLATOR'))
        .send({ description: 'Choisissez deux compétences…' });

      expect(res.status).toBe(200);
      expect(db.choiceTranslation.upsert).toHaveBeenCalledWith({
        where: { choiceId_localeCode: { choiceId: 9, localeCode: 'fr' } },
        create: { choiceId: 9, localeCode: 'fr', description: 'Choisissez deux compétences…' },
        update: { description: 'Choisissez deux compétences…' },
      });
    });

    it('should reject an empty required field, an unknown entity or an unknown language', async () => {
      const empty = await request(app).put('/api/admin/translations/choice/9/fr').set(asRole('TRANSLATOR')).send({ description: '  ' });
      const entity = await request(app).put('/api/admin/translations/monster/9/fr').set(asRole('TRANSLATOR')).send({ name: 'x' });
      const locale = await request(app).put('/api/admin/translations/choice/9/xx').set(asRole('TRANSLATOR')).send({ description: 'x' });

      expect(empty.status).toBe(400);
      expect(entity.status).toBe(404);
      expect(locale.status).toBe(400);
      expect(db.choiceTranslation.upsert).not.toHaveBeenCalled();
    });
  });
});
