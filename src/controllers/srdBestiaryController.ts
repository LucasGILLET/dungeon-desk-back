import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { proficiencyBonus } from '../characters/rules';
import { allLangs, LangContext, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';

// Bestiaire et objets magiques : liste légère pour la recherche et le filtrage,
// fiche détaillée par index (bloc de statistiques complet, description).

const t = allLangs;
const named = { select: { index: true, translations: t } } as const;
type Named = { index: string; translations: { localeCode: string; name: string }[] };
type Noted = { translations: { localeCode: string; note: string }[] };

const refOf = (ctx: LangContext) => (x: Named | null) => (x ? { index: x.index, name: pick(x.translations, ctx).name } : null);
const noteOf = (ctx: LangContext) => (x: Noted) => (x.translations.length ? pick(x.translations, ctx).note : null);
const editionWhere = (req: Request) => ({ edition: { code: req.params.edition } });

function setCache(res: Response) {
  res.set('Cache-Control', 'public, max-age=3600');
}

function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error fetching SRD ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: 'Server error' });
}

// --- Monstres -----------------------------------------------------------------------

const summaryInclude = {
  translations: t,
  creatureType: named,
  subtypes: { include: { creatureSubtype: named } },
  alignments: { include: { alignment: named }, orderBy: { alignmentId: 'asc' } },
  armorClasses: { orderBy: { position: 'asc' }, take: 1 },
} as const;

type MonsterSummaryRow = Awaited<ReturnType<typeof findSummaries>>[number];
const findSummaries = (where: object) =>
  prisma.monster.findMany({ where, orderBy: { index: 'asc' }, include: summaryInclude });

function summaryOf(m: MonsterSummaryRow, ctx: LangContext) {
  const ref = refOf(ctx);
  const mt = pick(m.translations, ctx);
  return {
    index: m.index,
    name: mt.name,
    lang: mt.lang,
    source: m.source,
    size: m.size,
    type: ref(m.creatureType)!,
    subtypes: m.subtypes.map((s) => ref(s.creatureSubtype)!),
    // Nuée de créatures de cette taille ("nuée de bêtes Très Petites")
    swarmOfSize: m.swarmOfSize,
    // Sans alignement, ou alignements possibles (9 = "tout alignement")
    alignment: { unaligned: m.isUnaligned, options: m.alignments.map((a) => ref(a.alignment)!) },
    armorClass: m.armorClasses[0]?.value ?? null,
    hitPoints: m.hitPoints,
    challengeRating: Number(m.challengeRating),
    xp: m.xp,
    legendary: m.legendaryActionsPerRound != null,
    imageUrl: m.imageUrl,
  };
}

export const getMonsters = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const monsters = await findSummaries(editionWhere(req));
    setCache(res);
    res.json(monsters.map((m) => summaryOf(m, ctx)));
  } catch (error) {
    fail(res, 'monsters', error);
  }
};

export const getMonsterByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const noteFor = noteOf(ctx);
    const m = await prisma.monster.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: {
        ...summaryInclude,
        armorClasses: {
          orderBy: { position: 'asc' },
          include: { equipment: { include: { equipment: named } }, spell: named, condition: named, translations: t },
        },
        savingThrows: { include: { abilityScore: { select: { index: true, position: true, translations: t } } } },
        skills: { include: { skill: named }, orderBy: { skill: { index: 'asc' } } },
        damageModifiers: { orderBy: { id: 'asc' }, include: { damageType: named, translations: t } },
        conditionImmunities: { include: { condition: named } },
        languages: { include: { language: named } },
        actions: {
          orderBy: { position: 'asc' },
          include: {
            translations: t,
            saveAbility: named,
            damages: { orderBy: { position: 'asc' }, include: { damageType: named } },
            multiattack: { orderBy: { position: 'asc' }, include: { targetAction: { select: { translations: t } } } },
            spellcasting: {
              include: {
                abilityScore: named,
                class: named,
                spells: { include: { spell: { select: { index: true, level: true, translations: t } } }, orderBy: { spell: { level: 'asc' } } },
              },
            },
          },
        },
        forms: { include: { formMonster: { select: { index: true, translations: t } } } },
      },
    });
    if (!m) {
      res.status(404).json({ message: 'Monster not found' });
      return;
    }

    const modifier = (kind: string) => m.damageModifiers
      .filter((d) => d.kind === kind)
      .map((d) => ({ damageType: ref(d.damageType), nonMagicalOnly: d.nonMagicalOnly, note: noteFor(d) }));
    const action = (a: (typeof m.actions)[number]) => {
      const at = pick(a.translations, ctx);
      const sc = a.spellcasting;
      return {
        name: at.name,
        description: at.description,
        attack: a.attackType
          ? { type: a.attackType, bonus: a.attackBonus, reachFt: a.reachFt, rangeFt: a.normalRangeFt != null ? { normal: a.normalRangeFt, long: a.longRangeFt } : null }
          : null,
        save: a.saveAbility ? { ability: ref(a.saveAbility)!, dc: a.saveDc, success: a.saveSuccess } : null,
        usage: a.usage,
        legendaryCost: a.legendaryCost,
        // Dégâts ; ceux d'un même alternativeGroup sont au choix
        damages: a.damages.map((d) => ({ dice: d.dice, damageType: ref(d.damageType)!, alternativeGroup: d.alternativeGroup })),
        // Attaques multiples : étapes d'un même groupe = une alternative
        multiattack: a.multiattack.map((s) => ({ action: pick(s.targetAction.translations, ctx).name, count: s.count, alternativeGroup: s.alternativeGroup })),
        spellcasting: sc
          ? {
            ability: ref(sc.abilityScore)!,
            saveDc: sc.saveDc,
            attackBonus: sc.attackBonus,
            casterLevel: sc.casterLevel,
            class: ref(sc.class),
            slots: sc.slots,
            spells: sc.spells.map((s) => ({ ...ref(s.spell)!, level: s.spell.level, usage: s.usage })),
          }
          : null,
      };
    };
    const actionsOf = (kind: string) => m.actions.filter((a) => a.kind === kind).map(action);
    const mt = pick(m.translations, ctx);
    const cr = Number(m.challengeRating);

    setCache(res);
    res.json({
      ...summaryOf(m, ctx),
      description: mt.description ?? null,
      armorClasses: m.armorClasses.map((ac) => ({
        value: ac.value,
        source: ac.sourceType,
        armor: ac.equipment.map((e) => ref(e.equipment)!),
        spell: ref(ac.spell),
        condition: ref(ac.condition),
        note: noteFor(ac),
      })),
      hitDice: { count: m.hitDiceCount, size: m.hitDieSize, bonus: m.hitPointBonus },
      speeds: m.speeds,
      abilityScores: { str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma },
      savingThrows: [...m.savingThrows]
        .sort((a, b) => a.abilityScore.position - b.abilityScore.position)
        .map((s) => ({ index: s.abilityScore.index, name: pick(s.abilityScore.translations, ctx).name, bonus: s.bonus })),
      skills: m.skills.map((s) => ({ ...ref(s.skill)!, bonus: s.bonus })),
      damageVulnerabilities: modifier('VULNERABILITY'),
      damageResistances: modifier('RESISTANCE'),
      damageImmunities: modifier('IMMUNITY'),
      conditionImmunities: m.conditionImmunities.map((c) => ref(c.condition)!),
      senses: m.senses,
      passivePerception: m.passivePerception,
      languages: {
        text: mt.languagesText ?? null,
        list: m.languages.map((l) => ({ ...ref(l.language)!, understandOnly: l.understandOnly })),
        telepathyFt: m.telepathyFt,
      },
      // Dérivé du facteur de puissance (FP 0 à 4 : +2)
      proficiencyBonus: proficiencyBonus(Math.ceil(cr)),
      legendaryActionsPerRound: m.legendaryActionsPerRound,
      traits: actionsOf('TRAIT'),
      actions: actionsOf('ACTION'),
      bonusActions: actionsOf('BONUS_ACTION'),
      reactions: actionsOf('REACTION'),
      legendaryActions: actionsOf('LEGENDARY'),
      lairActions: actionsOf('LAIR'),
      forms: m.forms.map((f) => ({ index: f.formMonster.index, name: pick(f.formMonster.translations, ctx).name })),
    });
  } catch (error) {
    fail(res, 'monster', error);
  }
};

// --- Objets magiques -------------------------------------------------------------------

export const getMagicItems = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const items = await prisma.magicItem.findMany({
      where: editionWhere(req),
      orderBy: { index: 'asc' },
      include: { translations: { ...t, select: { localeCode: true, name: true, subtitle: true } }, equipmentCategory: named, parent: { select: { index: true } } },
    });
    setCache(res);
    res.json(items.map((i) => {
      const it = pick(i.translations, ctx);
      return {
        index: i.index,
        name: it.name,
        lang: it.lang,
        source: i.source,
        subtitle: it.subtitle,
        category: ref(i.equipmentCategory)!,
        rarity: i.rarity,
        requiresAttunement: i.requiresAttunement,
        // Variante d'un objet générique ("Arme +1" → "arme, +1, +2 ou +3")
        variantOf: i.parent?.index ?? null,
        imageUrl: i.imageUrl,
      };
    }));
  } catch (error) {
    fail(res, 'magic items', error);
  }
};

export const getMagicItemByIndex = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = refOf(ctx);
    const i = await prisma.magicItem.findFirst({
      where: { ...editionWhere(req), index: req.params.index },
      include: {
        translations: t,
        equipmentCategory: named,
        parent: { select: { index: true, translations: t } },
        variants: { orderBy: { id: 'asc' }, select: { index: true, rarity: true, translations: t } },
      },
    });
    if (!i) {
      res.status(404).json({ message: 'Magic item not found' });
      return;
    }
    const it = pick(i.translations, ctx);
    setCache(res);
    res.json({
      index: i.index,
      name: it.name,
      lang: it.lang,
      source: i.source,
      subtitle: it.subtitle,
      description: it.description,
      category: ref(i.equipmentCategory)!,
      rarity: i.rarity,
      requiresAttunement: i.requiresAttunement,
      variantOf: i.parent ? ref(i.parent) : null,
      variants: i.variants.map((v) => ({ ...ref(v)!, rarity: v.rarity })),
      imageUrl: i.imageUrl,
    });
  } catch (error) {
    fail(res, 'magic item', error);
  }
};
