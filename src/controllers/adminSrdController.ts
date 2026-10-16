import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { CONTENT_ROLES } from '../middleware/requireRole';
import { TRANSLATABLE, TranslatableEntity, translationSchema, updateClassSchema } from '../validators/adminSrdValidator';

// Back-office des données de jeu. Les textes sont renvoyés par langue
// ({ en: {...}, fr: {...} }) pour être édités côte à côte.

type Row = { localeCode: string } & Record<string, unknown>;
type Texts = Record<string, Record<string, unknown>>;

const REFERENCE_LOCALE = 'en';

function byLocale(rows: Row[], fields: readonly string[]): Texts {
  return Object.fromEntries(rows.map((r) => [r.localeCode, Object.fromEntries(fields.map((f) => [f, r[f] ?? null]))]));
}

const fail = (res: Response, context: string, error: unknown) => {
  logger.error(`${context}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
};

export const getMe = (req: Request, res: Response) => {
  const { id, email, username, role } = req.user;
  res.json({ id, email, username, role });
};

// --- Traductions à faire -----------------------------------------------------

export interface TextItem {
  entity: TranslatableEntity;
  id: number;
  classIndex: string;
  context: string; // "Capacité · niv. 2"
  reference: Record<string, unknown>; // textes anglais
  translation: Record<string, unknown> | null; // textes dans la langue cible
  status: 'missing' | 'identical' | 'ok';
}

function status(entity: TranslatableEntity, reference: Record<string, unknown>, translation: Record<string, unknown> | null): TextItem['status'] {
  if (!translation) return 'missing';
  const long = TRANSLATABLE[entity].fields.filter((f) => typeof reference[f] === 'string' && (reference[f] as string).length > 20);
  return long.some((f) => translation[f] === reference[f]) ? 'identical' : 'ok';
}

// Tous les textes du domaine des classes, comparés à l'anglais
export async function collectClassTexts(edition: string, locale: string, classIndex?: string): Promise<TextItem[]> {
  const t = { where: { localeCode: { in: [REFERENCE_LOCALE, locale] } } };
  const classes = await prisma.class.findMany({
    where: { edition: { code: edition }, ...(classIndex ? { index: classIndex } : {}) },
    orderBy: { index: 'asc' },
    include: {
      translations: t,
      subclasses: { include: { translations: t } },
      features: { orderBy: [{ level: 'asc' }, { id: 'asc' }], include: { translations: t } },
      tableColumns: { include: { translations: t } },
      spellcasting: { include: { sections: { orderBy: { position: 'asc' }, include: { translations: t } } } },
      choices: { orderBy: { id: 'asc' }, include: { translations: t } },
    },
  });

  const items: TextItem[] = [];
  const push = (entity: TranslatableEntity, id: number, classIndex: string, context: string, rows: Row[]) => {
    const texts = byLocale(rows, TRANSLATABLE[entity].fields);
    const reference = texts[REFERENCE_LOCALE] ?? {};
    const translation = locale === REFERENCE_LOCALE ? reference : texts[locale] ?? null;
    items.push({ entity, id, classIndex, context, reference, translation, status: status(entity, reference, translation) });
  };
  for (const c of classes) {
    push('class', c.id, c.index, 'Classe', c.translations as Row[]);
    for (const s of c.subclasses) push('subclass', s.id, c.index, 'Sous-classe', s.translations as Row[]);
    for (const col of c.tableColumns) push('classTableColumn', col.id, c.index, 'Colonne de table', col.translations as Row[]);
    for (const sec of c.spellcasting?.sections ?? []) push('spellcastingSection', sec.id, c.index, 'Incantation', sec.translations as Row[]);
    for (const ch of c.choices) push('choice', ch.id, c.index, 'Choix', ch.translations as Row[]);
    for (const f of c.features) push('classFeature', f.id, c.index, `Capacité · niv. ${f.level}`, f.translations as Row[]);
  }
  return items;
}

export const getTranslationsTodo = async (req: Request, res: Response) => {
  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : 'fr';
    const items = await collectClassTexts(req.params.edition, locale);
    const todo = items.filter((i) => i.status !== 'ok');
    res.json({ locale, total: items.length, todo: todo.length, items: todo });
  } catch (error) {
    fail(res, 'Error fetching translations to do', error);
  }
};

export const saveTranslation = async (req: Request, res: Response) => {
  try {
    const entity = req.params.entity as TranslatableEntity;
    const config = TRANSLATABLE[entity];
    const id = Number(req.params.id);
    const { locale } = req.params;
    if (!config || !Number.isInteger(id)) return res.status(404).json({ message: 'Unknown translatable entity' });
    if (!(await prisma.locale.findUnique({ where: { code: locale } }))) return res.status(400).json({ message: 'Unknown locale' });

    const parsed = translationSchema(entity).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid translation', errors: parsed.error.format() });

    const delegate = (prisma as any)[config.model];
    const where = { [`${config.fk}_localeCode`]: { [config.fk]: id, localeCode: locale } };
    const saved = await delegate.upsert({ where, create: { [config.fk]: id, localeCode: locale, ...parsed.data }, update: parsed.data });
    res.json(saved);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2003') return res.status(404).json({ message: 'Entity not found' });
    fail(res, 'Error saving translation', error);
  }
};

// --- Classes -----------------------------------------------------------------

async function loadClass(edition: string, index: string) {
  return prisma.class.findFirst({
    where: { index, edition: { code: edition } },
    include: {
      translations: true,
      subclasses: { include: { translations: true } },
      features: { orderBy: [{ level: 'asc' }, { id: 'asc' }], include: { translations: true, subclass: true } },
    },
  });
}

function classDetail(cls: NonNullable<Awaited<ReturnType<typeof loadClass>>>) {
  return {
    id: cls.id,
    index: cls.index,
    hitDie: cls.hitDie,
    subclassLevel: cls.subclassLevel,
    source: cls.source,
    translations: byLocale(cls.translations as Row[], TRANSLATABLE.class.fields),
    subclasses: cls.subclasses.map((s) => ({ id: s.id, index: s.index, translations: byLocale(s.translations as Row[], TRANSLATABLE.subclass.fields) })),
    features: cls.features.map((f) => ({
      id: f.id,
      index: f.index,
      level: f.level,
      subclass: f.subclass?.index ?? null,
      translations: byLocale(f.translations as Row[], TRANSLATABLE.classFeature.fields),
    })),
  };
}

export const getAdminClasses = async (req: Request, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      where: { edition: { code: req.params.edition } },
      orderBy: { index: 'asc' },
      include: { translations: true },
    });
    const todo = await collectClassTexts(req.params.edition, 'fr');
    res.json(classes.map((c) => ({
      index: c.index,
      hitDie: c.hitDie,
      subclassLevel: c.subclassLevel,
      names: Object.fromEntries(c.translations.map((t) => [t.localeCode, t.name])),
      translationsTodo: todo.filter((i) => i.classIndex === c.index && i.status !== 'ok').length,
    })));
  } catch (error) {
    fail(res, 'Error fetching admin classes', error);
  }
};

export const getAdminClass = async (req: Request, res: Response) => {
  try {
    const cls = await loadClass(req.params.edition, req.params.index);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json(classDetail(cls));
  } catch (error) {
    fail(res, 'Error fetching admin class', error);
  }
};

export const updateAdminClass = async (req: Request, res: Response) => {
  try {
    const parsed = updateClassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid class data', errors: parsed.error.format() });
    const input = parsed.data;

    // Un traducteur ne modifie que les textes
    if (!CONTENT_ROLES.includes(req.user.role) && (input.hitDie !== undefined || input.subclassLevel !== undefined)) {
      return res.status(403).json({ message: 'Translators can only edit translations' });
    }

    const cls = await loadClass(req.params.edition, req.params.index);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const known = new Set((await prisma.locale.findMany({ select: { code: true } })).map((l) => l.code));
    const locales = [
      ...Object.keys(input.translations ?? {}),
      ...(input.features ?? []).flatMap((f) => Object.keys(f.translations)),
    ];
    const unknown = locales.filter((l) => !known.has(l));
    if (unknown.length) return res.status(400).json({ message: `Unknown locale: ${[...new Set(unknown)].join(', ')}` });

    const ownFeatures = new Set(cls.features.map((f) => f.id));
    const foreign = (input.features ?? []).filter((f) => !ownFeatures.has(f.id));
    if (foreign.length) return res.status(400).json({ message: 'Feature does not belong to this class', ids: foreign.map((f) => f.id) });

    await prisma.$transaction(async (tx) => {
      if (input.hitDie !== undefined || input.subclassLevel !== undefined) {
        await tx.class.update({ where: { id: cls.id }, data: { hitDie: input.hitDie, subclassLevel: input.subclassLevel } });
      }
      for (const [localeCode, data] of Object.entries(input.translations ?? {})) {
        await tx.classTranslation.upsert({
          where: { classId_localeCode: { classId: cls.id, localeCode } },
          create: { classId: cls.id, localeCode, ...data },
          update: data,
        });
      }
      for (const feature of input.features ?? []) {
        for (const [localeCode, data] of Object.entries(feature.translations)) {
          await tx.classFeatureTranslation.upsert({
            where: { classFeatureId_localeCode: { classFeatureId: feature.id, localeCode } },
            create: { classFeatureId: feature.id, localeCode, ...data },
            update: data,
          });
        }
      }
    });

    logger.info(`Class ${cls.index} updated by user ${req.user.id}`);
    res.json(classDetail((await loadClass(req.params.edition, req.params.index))!));
  } catch (error) {
    fail(res, 'Error updating admin class', error);
  }
};
