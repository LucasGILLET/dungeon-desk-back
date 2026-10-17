import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { allLangs, LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';

// Lecture publique des races, historiques et sorts, traduits et aplatis comme
// les classes (voir srdController et docs/modelisation/conventions.md §5).

const t = allLangs;
const named = { select: { index: true, translations: t } } as const;
type Named = { index: string; translations: { localeCode: string; name: string }[] };

const refOf = (ctx: LangContext) => (x: Named | null) => (x ? { index: x.index, name: pick(x.translations, ctx).name } : null);
const editionWhere = (req: Request) => ({ edition: { code: req.params.edition } });

function setCache(res: Response) {
  res.set('Cache-Control', 'public, max-age=3600');
}

function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error fetching SRD ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
}

// --- Races, sous-races et traits -----------------------------------------------

export const getRaces = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const trait = { include: { trait: { select: { index: true, translations: t } } } } as const;
    const bonus = { include: { abilityScore: named } } as const;
    const races = await prisma.race.findMany({
      where: editionWhere(req),
      orderBy: { id: 'asc' },
      include: {
        translations: t,
        abilityBonus: bonus,
        languages: { include: { language: named } },
        traits: trait,
        subraces: { orderBy: { id: 'asc' }, include: { translations: t, abilityBonus: bonus, traits: trait } },
      },
    });
    const traitOf = (row: { trait: { index: string; translations: { localeCode: string; name: string; description: string }[] } }) => {
      const tt = pick(row.trait.translations, ctx);
      return { index: row.trait.index, name: tt.name, description: tt.description };
    };
    const bonusOf = (b: { abilityScore: Named; bonus: number }) => ({ ...ref(b.abilityScore)!, bonus: b.bonus });

    setCache(res);
    res.json(races.map((r) => {
      const rt = pick(r.translations, ctx);
      return {
        index: r.index,
        name: rt.name,
        lang: rt.lang,
        source: r.source,
        sizes: r.sizes,
        speeds: r.speeds,
        age: rt.ageText,
        alignment: rt.alignmentText,
        size: rt.sizeText,
        languageDescription: rt.languageText,
        abilityBonuses: r.abilityBonus.map(bonusOf),
        languages: r.languages.map((l) => ref(l.language)),
        traits: r.traits.map(traitOf),
        subraces: r.subraces.map((s) => {
          const st = pick(s.translations, ctx);
          return {
            index: s.index,
            name: st.name,
            source: s.source,
            description: st.description,
            abilityBonuses: s.abilityBonus.map(bonusOf),
            traits: s.traits.map(traitOf),
          };
        }),
      };
    }));
  } catch (error) {
    fail(res, 'races', error);
  }
};

// --- Historiques -------------------------------------------------------------------

export const getBackgrounds = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const backgrounds = await prisma.background.findMany({
      where: editionWhere(req),
      orderBy: { index: 'asc' },
      include: {
        translations: t,
        proficiencies: { include: { proficiency: named } },
        startingEquipment: { include: { equipment: named } },
        personalityOptions: {
          orderBy: [{ kind: 'asc' }, { position: 'asc' }],
          include: { translations: t, alignments: { include: { alignment: named } } },
        },
      },
    });

    setCache(res);
    res.json(backgrounds.map((b) => {
      const bt = pick(b.translations, ctx);
      return {
        index: b.index,
        name: bt.name,
        lang: bt.lang,
        source: b.source,
        feature: bt.featureName ? { name: bt.featureName, description: bt.featureDescription } : null,
        proficiencies: b.proficiencies.map((p) => ref(p.proficiency)),
        startingEquipment: b.startingEquipment.map((e) => ({ ...ref(e.equipment)!, quantity: e.quantity })),
        // Tables de personnalité : id à renvoyer dans CharacterInput.personality
        personality: b.personalityOptions.map((o) => ({
          id: o.id,
          kind: o.kind,
          position: o.position,
          text: pick(o.translations, ctx).text,
          alignments: o.alignments.map((a) => ref(a.alignment)),
        })),
      };
    }));
  } catch (error) {
    fail(res, 'backgrounds', error);
  }
};

// --- Sorts ---------------------------------------------------------------------------

// Champs structurés, distances en pieds : le front met en forme selon la langue
export const getSpells = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const spells = await prisma.spell.findMany({
      where: editionWhere(req),
      orderBy: [{ level: 'asc' }, { index: 'asc' }],
      include: {
        translations: t,
        school: named,
        saveAbility: named,
        damageTypes: { include: { damageType: named } },
        classes: { include: { class: named } },
        subclasses: { distinct: ['subclassId'], include: { subclass: named } },
      },
    });

    setCache(res);
    res.json(spells.map((s) => {
      const st = pick(s.translations, ctx);
      return {
        index: s.index,
        name: st.name,
        lang: st.lang,
        source: s.source,
        level: s.level,
        school: ref(s.school),
        castingTime: { amount: s.castingTimeAmount, unit: s.castingTimeUnit, note: st.castingTimeNote },
        ritual: s.ritual,
        range: { type: s.rangeType, feet: s.rangeFt, note: st.rangeNote },
        components: {
          verbal: s.verbal, somatic: s.somatic, material: s.material,
          materialText: st.materialText, materialCostGp: s.materialCostGp != null ? Number(s.materialCostGp) : null, materialConsumed: s.materialConsumed,
        },
        duration: { type: s.durationType, amount: s.durationAmount, concentration: s.concentration },
        attackType: s.attackType,
        save: s.saveAbility ? { ability: ref(s.saveAbility), success: s.saveSuccess } : null,
        area: s.areaType ? { type: s.areaType, sizeFt: s.areaSizeFt } : null,
        damageTypes: s.damageTypes.map((d) => ref(d.damageType)),
        description: st.description,
        higherLevels: st.higherLevels,
        classes: s.classes.map((c) => ref(c.class)),
        subclasses: s.subclasses.map((c) => ref(c.subclass)),
      };
    }));
  } catch (error) {
    fail(res, 'spells', error);
  }
};
