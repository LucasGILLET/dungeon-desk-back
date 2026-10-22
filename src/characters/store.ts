// Écriture d'un personnage validé (CharacterPlan) et relecture au format
// d'échange (CharacterInput), avec les noms traduits pour l'affichage.
import { Prisma, PrismaClient } from '@prisma/client';
import { LangContext, pick } from '../srd/lang';
import type { CharacterInput } from './input';
import type { CharacterPlan } from './rules';

type Tx = Prisma.TransactionClient;

// Remplace tout le contenu du personnage (classes, choix, sorts, inventaire…)
async function writeChildren(tx: Tx, characterId: number, plan: CharacterPlan): Promise<void> {
  await tx.characterAbilityScore.createMany({ data: plan.abilityScores.map((a) => ({ characterId, ...a })) });

  const levelIds = new Map<string, number>(); // "classId:classLevel" → CharacterLevel.id
  for (const c of plan.classes) {
    const cc = await tx.characterClass.create({
      data: { characterId, classId: c.classId, subclassId: c.subclassId, position: c.position, hitDiceUsed: c.hitDiceUsed },
    });
    for (const l of c.levels) {
      const level = await tx.characterLevel.create({
        data: {
          characterClassId: cc.id, classLevel: l.classLevel, characterLevel: l.characterLevel, hitPointRoll: l.hitPointRoll, featId: l.featId,
          abilityIncreases: { create: l.abilityIncreases },
        },
      });
      levelIds.set(`${c.classId}:${l.classLevel}`, level.id);
    }
    await tx.characterSpell.createMany({
      data: plan.spells.filter((s) => s.classId === c.classId).map((s) => ({ characterId, characterClassId: cc.id, spellId: s.spellId, prepared: s.prepared })),
    });
  }

  await tx.characterChoice.createMany({
    data: plan.choices.map((c) => ({
      characterId, choiceId: c.choiceId, optionId: c.optionId, languageId: c.languageId, equipmentId: c.equipmentId,
      characterLevelId: c.level ? levelIds.get(`${c.level.classId}:${c.level.classLevel}`) ?? null : null,
    })),
  });
  await tx.characterItem.createMany({ data: plan.items.map((i) => ({ characterId, ...i })) });
  await tx.characterCurrency.createMany({ data: plan.currencies.map((c) => ({ characterId, ...c })) });
  await tx.characterPersonality.createMany({ data: plan.personality.map((p) => ({ characterId, ...p })) });
  await tx.characterCondition.createMany({ data: plan.conditionIds.map((conditionId) => ({ characterId, conditionId })) });
  await tx.characterSpellSlotUsage.createMany({ data: plan.spellSlotUsage.map((u) => ({ characterId, ...u })) });
  await tx.characterFeatureUsage.createMany({ data: plan.featureUsage.map((u) => ({ characterId, ...u })) });
}

export async function createCharacter(tx: Tx, userId: number, plan: CharacterPlan): Promise<number> {
  const character = await tx.character.create({ data: { userId, ...plan.core } });
  await writeChildren(tx, character.id, plan);
  return character.id;
}

export async function replaceCharacter(tx: Tx, characterId: number, plan: CharacterPlan): Promise<void> {
  await tx.character.update({ where: { id: characterId }, data: plan.core });
  const where = { characterId };
  // Les niveaux, augmentations, sorts et choix liés à un niveau suivent CharacterClass (cascade)
  await tx.characterChoice.deleteMany({ where });
  await tx.characterClass.deleteMany({ where });
  await tx.characterAbilityScore.deleteMany({ where });
  await tx.characterItem.deleteMany({ where });
  await tx.characterCurrency.deleteMany({ where });
  await tx.characterPersonality.deleteMany({ where });
  await tx.characterCondition.deleteMany({ where });
  await tx.characterSpellSlotUsage.deleteMany({ where });
  await tx.characterFeatureUsage.deleteMany({ where });
  await writeChildren(tx, characterId, plan);
}

// --- Lecture ---------------------------------------------------------------------

const indexOnly = { select: { index: true } } as const;
const named = { select: { index: true, translations: { select: { localeCode: true, name: true } } } } as const;

export const CHARACTER_INCLUDE = {
  edition: { select: { code: true } },
  race: named,
  subrace: named,
  background: named,
  alignment: indexOnly,
  abilityScores: { include: { abilityScore: indexOnly } },
  classes: {
    orderBy: { position: 'asc' },
    include: {
      class: named,
      subclass: named,
      levels: { orderBy: { classLevel: 'asc' }, include: { feat: indexOnly, abilityIncreases: { include: { abilityScore: indexOnly } } } },
      spells: { orderBy: { id: 'asc' }, include: { spell: indexOnly } },
    },
  },
  choices: { orderBy: { id: 'asc' }, include: { language: indexOnly, equipment: indexOnly } },
  items: { orderBy: { position: 'asc' }, include: { equipment: indexOnly, magicItem: indexOnly } },
  currencies: true,
  personality: { orderBy: { id: 'asc' } },
  conditions: { include: { condition: indexOnly } },
  spellSlotUsage: { orderBy: [{ pact: 'asc' }, { spellLevel: 'asc' }] },
  featureUsage: { include: { classFeature: indexOnly, trait: indexOnly } },
} satisfies Prisma.CharacterInclude;

export type StoredCharacter = Prisma.CharacterGetPayload<{ include: typeof CHARACTER_INCLUDE }>;

export function findCharacter(db: PrismaClient | Tx, id: number, userId: number) {
  return db.character.findFirst({ where: { id, userId }, include: CHARACTER_INCLUDE });
}

// Personnage stocké → format d'échange (celui qu'on renverrait pour le mettre à jour)
export function toInput(c: StoredCharacter): CharacterInput {
  return {
    edition: c.edition.code,
    name: c.name,
    race: c.race.index,
    subrace: c.subrace?.index ?? null,
    background: c.background?.index ?? null,
    alignment: c.alignment?.index ?? null,
    abilityMethod: c.abilityMethod,
    abilityScores: Object.fromEntries(c.abilityScores.map((a) => [a.abilityScore.index, a.score])),
    classes: c.classes.map((cc) => ({
      class: cc.class.index,
      subclass: cc.subclass?.index ?? null,
      hitDiceUsed: cc.hitDiceUsed,
      levels: cc.levels.map((l) => ({
        level: l.classLevel,
        characterLevel: l.characterLevel,
        hitPointRoll: l.hitPointRoll,
        feat: l.feat?.index ?? null,
        abilityIncreases: l.abilityIncreases.map((i) => ({ ability: i.abilityScore.index, bonus: i.bonus as 1 | 2 })),
      })),
    })),
    choices: c.choices.map((ch) => ({ choiceId: ch.choiceId, optionId: ch.optionId, language: ch.language?.index ?? null, equipment: ch.equipment?.index ?? null })),
    spells: c.classes.flatMap((cc) => cc.spells.map((s) => ({ spell: s.spell.index, class: cc.class.index, prepared: s.prepared }))),
    items: c.items.map((i) => ({
      equipment: i.equipment?.index ?? null, magicItem: i.magicItem?.index ?? null, name: i.name, description: i.description, quantity: i.quantity, equipped: i.equipped, attuned: i.attuned,
    })),
    currencies: Object.fromEntries(c.currencies.map((m) => [m.currency, m.amount])),
    personality: c.personality.map((p) => ({ kind: p.kind, optionId: p.optionId, text: p.customText })),
    conditions: c.conditions.map((x) => x.condition.index),
    state: {
      experiencePoints: c.experiencePoints,
      currentHitPoints: c.currentHitPoints,
      temporaryHitPoints: c.temporaryHitPoints,
      deathSaveSuccesses: c.deathSaveSuccesses,
      deathSaveFailures: c.deathSaveFailures,
      inspiration: c.inspiration,
      spellSlotsUsed: c.spellSlotUsage.map((u) => ({ level: u.spellLevel, pact: u.pact, used: u.used })),
      featureUsage: c.featureUsage.map((u) => ({ feature: u.classFeature?.index ?? null, trait: u.trait?.index ?? null, used: u.used })),
    },
    appearance: c.appearance,
    backstory: c.backstory,
    notes: c.notes,
    portraitUrl: c.portraitUrl,
  };
}

// Noms traduits des contenus du personnage, pour l'affichage
export function displayNames(c: StoredCharacter, lang: LangContext) {
  const name = (x: { translations: { localeCode: string; name: string }[] } | null) => (x ? pick(x.translations, lang).name : null);
  return {
    race: name(c.race),
    subrace: name(c.subrace),
    background: name(c.background),
    classes: c.classes.map((cc) => ({ class: name(cc.class), subclass: name(cc.subclass), level: cc.levels.length })),
  };
}
