import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { allLangs, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';
import { setCache } from '../srd/cache';

// Lecture des données de jeu (SRD). Les traductions sont aplaties dans l'objet :
// langue demandée, sinon langue par défaut (voir docs/modelisation/conventions.md).

export const getClasses = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const classes = await prisma.class.findMany({
      where: { edition: { code: req.params.edition } },
      include: {
        translations: allLangs,
        recommendedAbilities: { orderBy: { position: 'asc' }, include: { abilityScore: { select: { index: true, translations: allLangs } } } },
        spellcasting: { select: { casterType: true } },
      },
      orderBy: { index: 'asc' },
    });
    setCache(res);
    res.json(classes.map((c) => {
      const t = pick(c.translations, ctx);
      return {
        index: c.index, name: t.name, lang: t.lang, hitDie: c.hitDie, subclassLevel: c.subclassLevel,
        summary: t.summary, difficulty: c.difficulty, casterType: c.spellcasting?.casterType ?? null,
        recommendedAbilities: c.recommendedAbilities.map((r) => ({ index: r.abilityScore.index, name: pick(r.abilityScore.translations, ctx).name })),
      };
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
        subclasses: {
          orderBy: { id: 'asc' },
          include: {
            translations: t,
            spells: { orderBy: [{ requiredClassLevel: 'asc' }, { id: 'asc' }], include: { spell: { select: { index: true, level: true, translations: t } } } },
          },
        },
        features: { orderBy: [{ level: 'asc' }, { id: 'asc' }], include: { translations: t, subclass: true, parent: { select: { index: true } } } },
        _count: { select: { spells: true } },
        recommendedAbilities: { orderBy: { position: 'asc' }, include: { abilityScore: { include: { translations: t } } } },
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
      summary: ct.summary,
      difficulty: cls.difficulty,
      recommendedAbilities: cls.recommendedAbilities.map((r) => ref(r.abilityScore.index, r.abilityScore.translations)),
      savingThrows: cls.savingThrows.map((s) => ref(s.abilityScore.index, s.abilityScore.translations)),
      proficiencies: cls.proficiencies.map((p) => ref(p.proficiency.index, p.proficiency.translations)),
      startingEquipment: cls.startingEquipment.map((e) => ({ ...ref(e.equipment.index, e.equipment.translations), quantity: e.quantity })),
      choices: cls.choices.map((ch) => ({
        id: ch.id,
        kind: ch.kind,
        choose: ch.choose,
        description: pick(ch.translations, ctx).description,
        pool: ch.pool ? { type: ch.pool, category: ch.poolCategory && ref(ch.poolCategory.index, ch.poolCategory.translations) } : null,
        options: ch.options.map((o) => ({
          id: o.id,
          items: o.items.map((i) => {
            const target = i.proficiency ?? i.equipment ?? i.equipmentCategory;
            return { ...(target ? ref(target.index, target.translations) : {}), quantity: i.quantity, isCategory: !!i.equipmentCategory };
          }),
          choice: o.nestedChoice && {
            id: o.nestedChoice.id,
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
      subclasses: cls.subclasses.map((s) => {
        const st = pick(s.translations, ctx);
        return {
          index: s.index,
          name: st.name,
          source: s.source,
          icon: s.icon,
          description: st.description,
          // Sorts de domaine, de serment… (toujours préparés)
          spells: s.spells.map((sp) => ({ ...ref(sp.spell.index, sp.spell.translations), level: sp.spell.level, requiredClassLevel: sp.requiredClassLevel })),
        };
      }),
      features: cls.features.map((f) => {
        const ft = pick(f.translations, ctx);
        return { index: f.index, level: f.level, subclass: f.subclass?.index ?? null, parent: f.parent?.index ?? null, name: ft.name, description: ft.description };
      }),
    });
  } catch (error) {
    logger.error(`Error fetching SRD class: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};
