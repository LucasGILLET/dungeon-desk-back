// Chargement des données de jeu nécessaires pour valider un personnage : seules
// celles que le personnage désigne (sa race, ses classes, les choix accessibles…).
import { Prisma, PrismaClient } from '@prisma/client';
import type { CharacterInput } from './input';
import type { ChoiceRule, ClassRule, RulesContext } from './rules';

type Db = PrismaClient | Prisma.TransactionClient;

const byIndex = <T extends { index: string }>(rows: T[]) => new Map(rows.map((r) => [r.index, r]));
const ids = <T extends { index: string; id: number }>(rows: T[]) => new Map(rows.map((r) => [r.index, r.id]));
const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

const CHOICE_SELECT = {
  id: true, kind: true, choose: true, pool: true, poolCategoryId: true,
  classId: true, subclassId: true, classFeatureId: true, raceId: true, subraceId: true, traitId: true, backgroundId: true, parentOptionId: true,
  options: { select: { id: true, items: { select: { abilityScoreId: true, bonus: true, classFeatureId: true, traitId: true } } } },
} satisfies Prisma.ChoiceSelect;

type ChoiceRow = Prisma.ChoiceGetPayload<{ select: typeof CHOICE_SELECT }>;

const toChoiceRule = (c: ChoiceRow): ChoiceRule => ({
  id: c.id,
  kind: c.kind,
  choose: c.choose,
  pool: c.pool,
  poolCategoryId: c.poolCategoryId,
  owner: {
    classId: c.classId, subclassId: c.subclassId, classFeatureId: c.classFeatureId, raceId: c.raceId,
    subraceId: c.subraceId, traitId: c.traitId, backgroundId: c.backgroundId, parentOptionId: c.parentOptionId,
  },
  options: c.options,
});

export async function loadRulesContext(db: Db, input: CharacterInput): Promise<RulesContext> {
  const editionRow = await db.edition.findUnique({
    where: { code: input.edition },
    select: { id: true, code: true, pointBuyBudget: true, pointBuyCosts: true, standardArray: true },
  });
  const edition = editionRow && {
    ...editionRow,
    pointBuyCosts: editionRow.pointBuyCosts as Record<string, number>,
    standardArray: editionRow.standardArray as number[],
  };
  const abilities = await db.abilityScore.findMany({ select: { id: true, index: true } });
  const empty: RulesContext = {
    edition, abilities: ids(abilities), constitutionId: abilities.find((a) => a.index === 'con')?.id,
    race: null, subrace: null, background: null, alignmentId: null, classes: new Map(), subclassSpells: new Map(),
    feats: new Map(), spells: new Map(), equipment: new Map(), magicItems: new Map(), languages: new Map(), conditions: new Map(), traits: new Map(),
    choices: new Map(), categoryMembers: new Map(),
  };
  if (!edition) return empty;
  const editionId = edition.id;
  const inEdition = (values: (string | null | undefined)[]) => ({ editionId, index: { in: unique(values) } });

  const [race, subrace, background, alignment] = await Promise.all([
    db.race.findUnique({ where: { editionId_index: { editionId, index: input.race } }, include: { abilityBonus: true, traits: true } }),
    input.subrace ? db.subrace.findUnique({ where: { editionId_index: { editionId, index: input.subrace } }, include: { abilityBonus: true, traits: true } }) : null,
    input.background
      ? db.background.findUnique({ where: { editionId_index: { editionId, index: input.background } }, include: { personalityOptions: { select: { id: true, kind: true } } } })
      : null,
    input.alignment ? db.alignment.findUnique({ where: { index: input.alignment }, select: { id: true } }) : null,
  ]);

  const classRows = await db.class.findMany({
    where: inEdition(input.classes.map((c) => c.class)),
    include: {
      levels: { include: { spellSlots: true } },
      subclasses: { select: { id: true, index: true } },
      multiclassRequirements: true,
      spells: { select: { spellId: true } },
      features: { select: { id: true, index: true, level: true, subclassId: true } },
    },
  });
  const classes = new Map<string, ClassRule>(classRows.map((c) => [c.index, {
    id: c.id,
    index: c.index,
    hitDie: c.hitDie,
    subclassLevel: c.subclassLevel,
    levels: new Map(c.levels.map((l) => [l.level, {
      abilityScoreImprovements: l.abilityScoreImprovements,
      cantripsKnown: l.cantripsKnown,
      spellsKnown: l.spellsKnown,
      maxSpellLevel: Math.max(0, ...l.spellSlots.filter((s) => s.slots > 0).map((s) => s.spellLevel)),
    }])),
    subclasses: ids(c.subclasses),
    multiclassRequirements: c.multiclassRequirements,
    spellIds: new Set(c.spells.map((s) => s.spellId)),
    features: new Map(c.features.map((f) => [f.id, { index: f.index, level: f.level, subclassId: f.subclassId }])),
  }]));
  const subclassIds = classRows.flatMap((c) => c.subclasses.map((s) => s.id));
  const featureIds = classRows.flatMap((c) => c.features.map((f) => f.id));

  const levels = input.classes.flatMap((c) => c.levels);
  const [subclassSpells, feats, spells, equipment, magicItems, languages, conditions, traits] = await Promise.all([
    db.subclassSpell.findMany({ where: { subclassId: { in: subclassIds } }, select: { subclassId: true, spellId: true } }),
    db.feat.findMany({ where: inEdition(levels.map((l) => l.feat)), include: { prerequisites: true } }),
    db.spell.findMany({ where: inEdition(input.spells.map((s) => s.spell)), select: { id: true, index: true, level: true } }),
    db.equipment.findMany({ where: inEdition([...input.items.map((i) => i.equipment), ...input.choices.map((c) => c.equipment)]), select: { id: true, index: true } }),
    db.magicItem.findMany({ where: inEdition(input.items.map((i) => i.magicItem)), select: { id: true, index: true } }),
    db.language.findMany({ where: inEdition(input.choices.map((c) => c.language)), select: { id: true, index: true } }),
    db.condition.findMany({ where: inEdition(input.conditions), select: { id: true, index: true } }),
    db.trait.findMany({ where: inEdition(input.state.featureUsage.map((u) => u.trait)), select: { id: true, index: true } }),
  ]);

  // Choix : ceux des propriétaires du personnage, ceux qu'il a répondus, leurs
  // sous-choix ; puis ceux des traits et capacités accordés par ses options.
  const raceTraitIds = [...(race?.traits ?? []), ...(subrace?.traits ?? [])].map((t) => t.traitId);
  const optionIds = input.choices.map((c) => c.optionId).filter((v): v is number => v != null);
  const owners: Prisma.ChoiceWhereInput[] = [
    { id: { in: input.choices.map((c) => c.choiceId) } },
    { parentOptionId: { in: optionIds } },
    { classId: { in: classRows.map((c) => c.id) } },
    { subclassId: { in: subclassIds } },
    { classFeatureId: { in: featureIds } },
    { traitId: { in: raceTraitIds } },
  ];
  if (race) owners.push({ raceId: race.id });
  if (subrace) owners.push({ subraceId: subrace.id });
  if (background) owners.push({ backgroundId: background.id });
  const choices = new Map<number, ChoiceRule>();
  for (const c of await db.choice.findMany({ where: { OR: owners }, select: CHOICE_SELECT })) choices.set(c.id, toChoiceRule(c));
  const chosen = new Set(optionIds);
  const grantedTraits = [...choices.values()].flatMap((c) => c.options.filter((o) => chosen.has(o.id)).flatMap((o) => o.items.map((i) => i.traitId)))
    .filter((v): v is number => v != null);
  if (grantedTraits.length) {
    for (const c of await db.choice.findMany({ where: { traitId: { in: grantedTraits } }, select: CHOICE_SELECT })) choices.set(c.id, toChoiceRule(c));
  }

  const poolCategories = [...new Set([...choices.values()].map((c) => c.poolCategoryId).filter((v): v is number => v != null))];
  const members = await db.equipmentCategoryItem.findMany({ where: { categoryId: { in: poolCategories } }, select: { categoryId: true, equipmentId: true } });
  const categoryMembers = new Map<number, Set<number>>();
  for (const m of members) {
    if (!categoryMembers.has(m.categoryId)) categoryMembers.set(m.categoryId, new Set());
    categoryMembers.get(m.categoryId)!.add(m.equipmentId);
  }

  const subclassSpellMap = new Map<number, Set<number>>();
  for (const s of subclassSpells) {
    if (!subclassSpellMap.has(s.subclassId)) subclassSpellMap.set(s.subclassId, new Set());
    subclassSpellMap.get(s.subclassId)!.add(s.spellId);
  }
  const bonuses = (rows: { abilityScoreId: number; bonus: number }[]) => new Map(rows.map((b) => [b.abilityScoreId, b.bonus]));

  return {
    ...empty,
    race: race && { id: race.id, bonuses: bonuses(race.abilityBonus), traitIds: race.traits.map((t) => t.traitId) },
    subrace: subrace && { id: subrace.id, raceId: subrace.raceId, bonuses: bonuses(subrace.abilityBonus), traitIds: subrace.traits.map((t) => t.traitId) },
    background: background && { id: background.id, personality: new Map(background.personalityOptions.map((o) => [o.id, o.kind])) },
    alignmentId: alignment?.id ?? null,
    classes,
    subclassSpells: subclassSpellMap,
    feats: byIndex(feats),
    spells: byIndex(spells),
    equipment: ids(equipment),
    magicItems: ids(magicItems),
    languages: ids(languages),
    conditions: ids(conditions),
    traits: ids(traits),
    choices,
    categoryMembers,
  };
}
