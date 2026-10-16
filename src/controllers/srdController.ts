import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';

// Lecture des données de jeu (SRD). Les traductions sont aplaties dans l'objet :
// langue demandée, sinon langue par défaut (voir docs/modelisation/conventions.md).

type Translated = { localeCode: string };

interface LangContext {
  lang: string;
  fallback: string;
}

let localesCache: { codes: string[]; fallback: string } | null = null;

async function locales() {
  if (!localesCache) {
    const rows = await prisma.locale.findMany({ orderBy: { position: 'asc' } });
    localesCache = { codes: rows.map((r) => r.code), fallback: rows.find((r) => r.isDefault)?.code ?? 'en' };
  }
  return localesCache;
}

// ?lang=fr, sinon le premier code connu de Accept-Language, sinon la langue par défaut
async function resolveLang(req: Request): Promise<LangContext> {
  const { codes, fallback } = await locales();
  const wanted = [
    typeof req.query.lang === 'string' ? req.query.lang : undefined,
    ...(req.headers['accept-language'] ?? '').split(',').map((part) => part.split(';')[0].trim().slice(0, 2)),
  ];
  return { lang: wanted.find((code) => code && codes.includes(code)) ?? fallback, fallback };
}

function pick<T extends Translated>(translations: T[], ctx: LangContext): T & { lang: string } {
  const row = translations.find((t) => t.localeCode === ctx.lang)
    ?? translations.find((t) => t.localeCode === ctx.fallback)
    ?? translations[0];
  return { ...row, lang: row?.localeCode };
}

// Toutes les langues : un contenu maison n'existe parfois que dans la langue de son
// auteur (sous-classes custom en français) ; pick() retombe alors sur celle-ci.
const allLangs = { orderBy: { localeCode: 'asc' as const } };

function setCache(res: Response) {
  res.set('Cache-Control', 'public, max-age=3600');
}

export const getClasses = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const classes = await prisma.class.findMany({
      where: { edition: { code: req.params.edition } },
      include: { translations: allLangs },
      orderBy: { index: 'asc' },
    });
    setCache(res);
    res.json(classes.map((c) => {
      const t = pick(c.translations, ctx);
      return { index: c.index, name: t.name, lang: t.lang, hitDie: c.hitDie, subclassLevel: c.subclassLevel };
    }));
  } catch (error) {
    logger.error(`Error fetching SRD classes: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClassByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const t = allLangs;
    const cls = await prisma.class.findFirst({
      where: { index: req.params.index, edition: { code: req.params.edition } },
      include: {
        translations: t,
        savingThrows: { include: { abilityScore: { include: { translations: t } } } },
        proficiencies: { include: { proficiency: { include: { translations: t } } } },
        startingEquipment: { include: { equipment: { include: { translations: t } } } },
        choices: {
          orderBy: { id: 'asc' },
          include: {
            translations: t,
            poolCategory: { include: { translations: t } },
            options: {
              orderBy: { position: 'asc' },
              include: {
                items: {
                  include: {
                    proficiency: { include: { translations: t } },
                    equipment: { include: { translations: t } },
                    equipmentCategory: { include: { translations: t } },
                  },
                },
                nestedChoice: { include: { translations: t, poolCategory: { include: { translations: t } } } },
              },
            },
          },
        },
        tableColumns: { orderBy: { position: 'asc' }, include: { translations: t } },
        levels: { orderBy: { level: 'asc' }, include: { spellSlots: { orderBy: { spellLevel: 'asc' } }, values: true } },
        spellcasting: {
          include: {
            abilityScore: { include: { translations: t } },
            sections: { orderBy: { position: 'asc' }, include: { translations: t } },
          },
        },
        subclasses: { include: { translations: t } },
        features: { orderBy: [{ level: 'asc' }, { id: 'asc' }], include: { translations: t, subclass: true } },
        _count: { select: { spells: true } },
      },
    });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const ref = (index: string, translations: { localeCode: string; name: string }[]) => ({ index, name: pick(translations, ctx).name });
    const columns = new Map(cls.tableColumns.map((c) => [c.id, c.key]));
    const ct = pick(cls.translations, ctx);

    setCache(res);
    res.json({
      index: cls.index,
      edition: req.params.edition,
      lang: ct.lang,
      name: ct.name,
      hitDie: cls.hitDie,
      subclassLevel: cls.subclassLevel,
      subclassLabel: ct.subclassLabel,
      savingThrows: cls.savingThrows.map((s) => ref(s.abilityScore.index, s.abilityScore.translations)),
      proficiencies: cls.proficiencies.map((p) => ref(p.proficiency.index, p.proficiency.translations)),
      startingEquipment: cls.startingEquipment.map((e) => ({ ...ref(e.equipment.index, e.equipment.translations), quantity: e.quantity })),
      choices: cls.choices.map((ch) => ({
        kind: ch.kind,
        choose: ch.choose,
        description: pick(ch.translations, ctx).description,
        pool: ch.pool ? { type: ch.pool, category: ch.poolCategory && ref(ch.poolCategory.index, ch.poolCategory.translations) } : null,
        options: ch.options.map((o) => ({
          items: o.items.map((i) => {
            const target = i.proficiency ?? i.equipment ?? i.equipmentCategory;
            return { ...(target ? ref(target.index, target.translations) : {}), quantity: i.quantity, isCategory: !!i.equipmentCategory };
          }),
          choice: o.nestedChoice && {
            choose: o.nestedChoice.choose,
            description: pick(o.nestedChoice.translations, ctx).description,
            category: o.nestedChoice.poolCategory && ref(o.nestedChoice.poolCategory.index, o.nestedChoice.poolCategory.translations),
          },
        })),
      })),
      table: {
        columns: cls.tableColumns.map((c) => ({ key: c.key, label: pick(c.translations, ctx).label, type: c.valueType })),
        levels: cls.levels.map((l) => ({
          level: l.level,
          abilityScoreImprovements: l.abilityScoreImprovements,
          cantripsKnown: l.cantripsKnown,
          spellsKnown: l.spellsKnown,
          spellSlots: l.spellSlots.map((s) => s.slots),
          values: Object.fromEntries(l.values.map((v) => [
            columns.get(v.columnId),
            v.intValue ?? v.boolValue ?? (v.diceCount != null ? `${v.diceCount}d${v.diceValue}` : null),
          ])),
        })),
      },
      spellcasting: cls.spellcasting && {
        ability: ref(cls.spellcasting.abilityScore.index, cls.spellcasting.abilityScore.translations),
        startLevel: cls.spellcasting.startLevel,
        casterType: cls.spellcasting.casterType,
        ritualCasting: cls.spellcasting.ritualCasting,
        sections: cls.spellcasting.sections.map((s) => {
          const st = pick(s.translations, ctx);
          return { title: st.title, description: st.description, lang: st.lang };
        }),
        spellCount: cls._count.spells,
      },
      subclasses: cls.subclasses.map((s) => ref(s.index, s.translations)),
      features: cls.features.map((f) => {
        const ft = pick(f.translations, ctx);
        return { index: f.index, level: f.level, subclass: f.subclass?.index ?? null, name: ft.name, description: ft.description };
      }),
    });
  } catch (error) {
    logger.error(`Error fetching SRD class: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};
