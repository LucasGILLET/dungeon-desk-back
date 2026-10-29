import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { allLangs, LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';
import { setCache } from '../srd/cache';

// Lecture publique des races, historiques et sorts, traduits et aplatis comme
// les classes (voir srdController et docs/modelisation/conventions.md §5).

const t = allLangs;
const named = { select: { index: true, translations: t } } as const;
type Named = { index: string; translations: { localeCode: string; name: string }[] };

const refOf = (ctx: LangContext) => (x: Named | null) => (x ? { index: x.index, name: pick(x.translations, ctx).name } : null);
const editionWhere = (req: Request) => ({ edition: { code: req.params.edition } });

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
        // Bonus de caractéristique au choix (demi-elfe : +1 à deux caractéristiques)
        choices: { where: { kind: 'ABILITY_SCORE_INCREASE' }, select: { choose: true, options: { select: { items: { select: { bonus: true } } }, take: 1 } } },
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
        icon: r.icon,
        summary: rt.summary,
        sizes: r.sizes,
        speeds: r.speeds,
        age: rt.ageText,
        alignment: rt.alignmentText,
        size: rt.sizeText,
        languageDescription: rt.languageText,
        abilityBonuses: r.abilityBonus.map(bonusOf),
        abilityBonusChoice: r.choices[0] ? { choose: r.choices[0].choose, bonus: r.choices[0].options[0]?.items[0]?.bonus ?? 1 } : null,
        // Générateur de PNJ : fréquence de tirage, taille et poids (base + variation)
        npcProfile: {
          frequency: r.npcFrequency,
          heightCm: r.baseHeightCm != null ? { base: r.baseHeightCm, variance: r.heightVarianceCm ?? 0 } : null,
          weightKg: r.baseWeightKg != null ? { base: r.baseWeightKg, variance: r.weightVarianceKg ?? 0 } : null,
        },
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
        icon: b.icon,
        summary: bt.summary ?? b.translations.find((x) => x.summary)?.summary ?? null,
        // Champ par champ : un historique maison a un nom français mais une description anglaise
        feature: bt.featureName
          ? { name: bt.featureName, description: bt.featureDescription ?? b.translations.find((x) => x.featureDescription)?.featureDescription ?? null }
          : null,
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

// --- Référentiels utiles à la fiche de personnage --------------------------------------

export const getConditions = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.condition.findMany({ where: editionWhere(req), orderBy: { index: 'asc' }, include: { translations: t } });
    setCache(res);
    res.json(rows.map((c) => {
      const ct = pick(c.translations, ctx);
      return { index: c.index, name: ct.name, description: ct.description };
    }));
  } catch (error) {
    fail(res, 'conditions', error);
  }
};

// Catalogue d'équipement (ajout à l'inventaire) : sans statistiques détaillées
export const getEquipment = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.equipment.findMany({
      where: editionWhere(req),
      orderBy: { index: 'asc' },
      include: { translations: t, weapon: { select: { damageDice: true } }, armor: { select: { baseArmorClass: true } } },
    });
    setCache(res);
    res.json(rows.map((e) => ({
      index: e.index,
      name: pick(e.translations, ctx).name,
      kind: e.kind,
      source: e.source,
      cost: e.costAmount != null ? { amount: e.costAmount, currency: e.costCurrency } : null,
      weightLb: e.weightLb != null ? Number(e.weightLb) : null,
      damage: e.weapon?.damageDice ?? null,
      armorClass: e.armor?.baseArmorClass ?? null,
    })));
  } catch (error) {
    fail(res, 'equipment', error);
  }
};

// Fiche complète d'un objet : description, catégories, statistiques d'arme
// (dégâts, propriétés et leur règle) ou d'armure
export const getEquipmentByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const e = await prisma.equipment.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: {
        translations: t,
        categories: { include: { category: named } },
        weapon: { include: { damageType: named, properties: { include: { property: named } } } },
        armor: true,
      },
    });
    if (!e) {
      res.status(404).json({ message: 'Equipment not found' });
      return;
    }
    const et = pick(e.translations, ctx);
    const w = e.weapon;
    setCache(res);
    res.json({
      index: e.index,
      name: et.name,
      description: et.description ?? null,
      kind: e.kind,
      source: e.source,
      cost: e.costAmount != null ? { amount: e.costAmount, currency: e.costCurrency } : null,
      weightLb: e.weightLb != null ? Number(e.weightLb) : null,
      categories: e.categories.map((c) => ref(c.category)),
      weapon: w && {
        category: w.category,
        range: w.range,
        damage: w.damageDice,
        damageType: ref(w.damageType),
        versatileDamage: w.versatileDice,
        normalRangeFt: w.normalRangeFt,
        longRangeFt: w.longRangeFt,
        properties: w.properties.map((p) => {
          const pt = pick(p.property.translations, ctx);
          return { index: p.property.index, name: pt.name, description: pt.description };
        }),
      },
      armor: e.armor && {
        category: e.armor.category,
        baseArmorClass: e.armor.baseArmorClass,
        addsDexModifier: e.armor.addsDexModifier,
        maxDexModifier: e.armor.maxDexModifier,
        strengthMinimum: e.armor.strengthMinimum,
        stealthDisadvantage: e.armor.stealthDisadvantage,
      },
    });
  } catch (error) {
    fail(res, 'equipment item', error);
  }
};

export const getFeats = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const rows = await prisma.feat.findMany({
      where: editionWhere(req),
      orderBy: { index: 'asc' },
      include: { translations: t, prerequisites: { include: { abilityScore: named } } },
    });
    setCache(res);
    res.json(rows.map((f) => {
      const ft = pick(f.translations, ctx);
      return {
        index: f.index,
        name: ft.name,
        description: ft.description,
        source: f.source,
        prerequisites: f.prerequisites.map((p) => ({ ability: ref(p.abilityScore), minimumScore: p.minimumScore, alternativeGroup: p.alternativeGroup })),
      };
    }));
  } catch (error) {
    fail(res, 'feats', error);
  }
};

// Compétences et leur caractéristique (Arcanes → INT), pour la fiche
export const getSkills = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const rows = await prisma.skill.findMany({ orderBy: { index: 'asc' }, include: { translations: t, abilityScore: named } });
    setCache(res);
    res.json(rows.map((s) => ({ index: s.index, name: pick(s.translations, ctx).name, ability: ref(s.abilityScore) })));
  } catch (error) {
    fail(res, 'skills', error);
  }
};

// --- Caractéristiques, règles de création, générateur de PNJ ------------------------------

export const getAbilityScores = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.abilityScore.findMany({ orderBy: { id: 'asc' }, include: { translations: t } });
    setCache(res);
    res.json(rows.map((a) => {
      const at = pick(a.translations, ctx);
      return { index: a.index, name: at.name, abbreviation: at.abbreviation, summary: at.summary ?? null, description: at.description ?? null };
    }));
  } catch (error) {
    fail(res, 'ability scores', error);
  }
};

// Règles de création des caractéristiques de l'édition
export const getCreationRules = async (req: Request, res: Response) => {
  try {
    const edition = await prisma.edition.findUnique({ where: { code: req.params.edition } });
    if (!edition) return res.status(404).json({ message: 'Edition not found' });
    setCache(res);
    res.json({
      pointBuy: { budget: edition.pointBuyBudget, costs: edition.pointBuyCosts },
      standardArray: edition.standardArray,
    });
  } catch (error) {
    fail(res, 'creation rules', error);
  }
};

// Tables du générateur, par type : { PROFESSION: [{ race: null, text: 'Forgeron', weight: 1 }], … }
export const getNpcTables = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.npcTableEntry.findMany({
      where: { OR: [{ raceId: null }, { race: editionWhere(req) }] },
      orderBy: { id: 'asc' },
      include: { race: { select: { index: true } }, translations: { orderBy: { localeCode: 'asc' } } },
    });
    const tables: Record<string, { race: string | null; text: string; weight: number }[]> = {};
    for (const e of rows) {
      if (!e.translations.length) continue;
      const { text } = pick(e.translations, ctx);
      (tables[e.kind] ??= []).push({ race: e.race?.index ?? null, text, weight: e.weight });
    }
    setCache(res);
    res.json(tables);
  } catch (error) {
    fail(res, 'NPC tables', error);
  }
};

export const getAlignments = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.alignment.findMany({ orderBy: { id: 'asc' }, include: { translations: t } });
    setCache(res);
    res.json(rows.map((a) => {
      const at = pick(a.translations, ctx);
      // "Loyal Bon (LB)" : l'abréviation a déjà son champ
      return { index: a.index, name: at.name.replace(/\s*\([^)]*\)$/, ''), abbreviation: at.abbreviation, ethic: a.ethic, morality: a.morality };
    }));
  } catch (error) {
    fail(res, 'alignments', error);
  }
};
