import { describe, it, expect } from 'vitest';
import { CharacterInputSchema } from '../characters/input';
import { analyse, ChoiceRule, ClassRule, RulesContext } from '../characters/rules';

// Règles de construction sur un contexte réduit : magicien, guerrier, elfe.
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const abilityId = (index: string) => ABILITIES.indexOf(index) + 1;

const levels = (spells: (l: number) => { cantripsKnown: number | null; maxSpellLevel: number }) =>
  new Map(Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    // Augmentations de caractéristique aux niveaux 4, 8, 12, 16, 19
    const asi = [4, 8, 12, 16, 19].filter((n) => n <= level).length;
    return [level, { abilityScoreImprovements: asi, spellsKnown: null, ...spells(level) }];
  }));

const owner = (o: Partial<ChoiceRule['owner']>): ChoiceRule['owner'] => ({
  classId: null, subclassId: null, classFeatureId: null, raceId: null, subraceId: null, traitId: null, backgroundId: null, parentOptionId: null, ...o,
});
const option = (id: number) => ({ id, items: [{ abilityScoreId: null, bonus: null, classFeatureId: null, traitId: null }] });

const wizard: ClassRule = {
  id: 1, index: 'wizard', hitDie: 6, subclassLevel: 2,
  levels: levels((l) => ({ cantripsKnown: l < 4 ? 3 : 4, maxSpellLevel: Math.min(Math.ceil(l / 2), 9) })),
  subclasses: new Map([['evocation', 11]]),
  multiclassRequirements: [{ abilityScoreId: abilityId('int'), minimumScore: 13, alternativeGroup: 1 }],
  spellIds: new Set([100, 101, 103]),
  features: new Map(),
};
const fighter: ClassRule = {
  id: 2, index: 'fighter', hitDie: 10, subclassLevel: 3,
  levels: levels(() => ({ cantripsKnown: null, maxSpellLevel: 0 })),
  subclasses: new Map([['champion', 21]]),
  // FOR 13 ou DEX 13
  multiclassRequirements: [
    { abilityScoreId: abilityId('str'), minimumScore: 13, alternativeGroup: 1 },
    { abilityScoreId: abilityId('dex'), minimumScore: 13, alternativeGroup: 1 },
  ],
  spellIds: new Set(),
  features: new Map([[50, { index: 'fighting-style', level: 1, subclassId: null }]]),
};

const choices: ChoiceRule[] = [
  // Compétences du magicien : 2 parmi 3
  { id: 10, kind: 'PROFICIENCY', choose: 2, owner: owner({ classId: 1 }), pool: null, poolCategoryId: null, options: [option(1001), option(1002), option(1003)] },
  // Style de combat du guerrier
  { id: 20, kind: 'SUBFEATURE', choose: 1, owner: owner({ classFeatureId: 50 }), pool: null, poolCategoryId: null, options: [option(2001), option(2002)] },
  // Maîtrise de multiclassage (classe suivante uniquement)
  { id: 30, kind: 'MULTICLASS_PROFICIENCY', choose: 1, owner: owner({ classId: 2 }), pool: null, poolCategoryId: null, options: [option(3001)] },
  // Langue au choix de l'historique
  { id: 40, kind: 'LANGUAGE', choose: 1, owner: owner({ backgroundId: 7 }), pool: 'ANY_LANGUAGE', poolCategoryId: null, options: [] },
];

const ctx: RulesContext = {
  edition: { id: 1, code: '2014', pointBuyBudget: 27, pointBuyCosts: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }, standardArray: [15, 14, 13, 12, 10, 8] },
  abilities: new Map(ABILITIES.map((a) => [a, abilityId(a)])),
  constitutionId: abilityId('con'),
  race: { id: 5, bonuses: new Map([[abilityId('dex'), 2]]), traitIds: [] },
  subrace: null,
  background: { id: 7, personality: new Map([[70, 'IDEAL']]) },
  alignmentId: null,
  classes: new Map([['wizard', wizard], ['fighter', fighter]]),
  subclassSpells: new Map(),
  feats: new Map([['grappler', { id: 60, prerequisites: [{ abilityScoreId: abilityId('str'), minimumScore: 13, alternativeGroup: 1 }] }]]),
  spells: new Map([['fire-bolt', { id: 100, level: 0 }], ['magic-missile', { id: 101, level: 1 }], ['cure-wounds', { id: 102, level: 1 }], ['fireball', { id: 103, level: 3 }]]),
  equipment: new Map([['dagger', 200]]),
  magicItems: new Map([['cloak-of-elvenkind', 300], ['weapon-1', 301]]),
  equipmentKinds: new Map([['dagger', 'WEAPON']]),
  magicItemCategories: new Map([['cloak-of-elvenkind', 'wondrous-items'], ['weapon-1', 'weapon']]),
  languages: new Map([['giant', 300]]),
  conditions: new Map(),
  traits: new Map(),
  choices: new Map(choices.map((c) => [c.id, c])),
  categoryMembers: new Map(),
};

const lv = (level: number, characterLevel: number, extra = {}) => ({ level, characterLevel, ...extra });

// Magicien 4 (évocation, +2 INT au niveau 4) : 15 14 13 12 10 8 en tableau standard
const base = () => ({
  name: 'Elandra',
  race: 'elf',
  background: 'acolyte',
  abilityMethod: 'STANDARD_ARRAY',
  abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  classes: [{ class: 'wizard', subclass: 'evocation', levels: [lv(1, 1), lv(2, 2, { hitPointRoll: 5 }), lv(3, 3), lv(4, 4, { abilityIncreases: [{ ability: 'int', bonus: 2 }] })] }],
  choices: [{ choiceId: 10, optionId: 1001 }, { choiceId: 10, optionId: 1002 }, { choiceId: 40, language: 'giant' }],
  spells: [{ spell: 'fire-bolt', class: 'wizard' }, { spell: 'magic-missile', class: 'wizard', prepared: true }],
  items: [{ equipment: 'dagger', quantity: 2 }],
  personality: [{ kind: 'IDEAL', optionId: 70 }],
});

const run = (raw: unknown) => analyse(CharacterInputSchema.parse(raw), ctx);
const messages = (raw: unknown) => run(raw).errors.map((e) => e.message);

describe('Character rules', () => {
  it('should accept a complete character and compute its sheet', () => {
    const result = run(base());

    expect(result.errors).toEqual([]);
    expect(result.plan?.classes[0]).toMatchObject({ classId: 1, subclassId: 11, position: 0 });
    // Choix de classe rattachés au niveau 1 du magicien, langue d'historique sans niveau
    expect(result.plan?.choices.map((c) => c.level)).toEqual([{ classId: 1, classLevel: 1 }, { classId: 1, classLevel: 1 }, null]);
    expect(result.sheet).toMatchObject({
      level: 4,
      proficiencyBonus: 2,
      // 6+1, puis 5+1 (jet), 4+1 et 4+1 (moyenne)
      maxHitPoints: 7 + 6 + 5 + 5,
      pending: { subclasses: [], abilityScoreImprovements: [], choices: [] },
    });
    expect(result.sheet?.abilityScores.int).toEqual({ base: 15, bonus: 2, total: 17, modifier: 3 });
    expect(result.sheet?.abilityScores.dex).toEqual({ base: 14, bonus: 2, total: 16, modifier: 3 });
  });

  it('should report what remains to choose instead of refusing an incomplete character', () => {
    const raw = base();
    raw.classes[0].subclass = undefined as never;
    raw.classes[0].levels[3] = lv(4, 4);
    raw.choices = [{ choiceId: 10, optionId: 1001 }];

    const result = run(raw);

    expect(result.errors).toEqual([]);
    expect(result.sheet?.pending).toEqual({
      subclasses: ['wizard'],
      abilityScoreImprovements: [{ class: 'wizard', level: 4 }],
      choices: [{ choiceId: 10, kind: 'PROFICIENCY', remaining: 1 }, { choiceId: 40, kind: 'LANGUAGE', remaining: 1 }],
    });
  });

  it('should multiclass when the requirements are met', () => {
    const raw = base();
    raw.classes.push({ class: 'fighter', levels: [lv(1, 5, { hitPointRoll: 8 })] } as never);
    raw.choices.push({ choiceId: 20, optionId: 2001 }, { choiceId: 30, optionId: 3001 });

    const result = run(raw);

    expect(result.errors).toEqual([]);
    expect(result.sheet).toMatchObject({ level: 5, proficiencyBonus: 3 });
    expect(result.plan?.choices.at(-2)?.level).toEqual({ classId: 2, classLevel: 1 });
  });

  it('should refuse a multiclass without the ability scores', () => {
    const raw = { ...base(), abilityMethod: 'MANUAL', abilityScores: { str: 8, dex: 8, con: 13, int: 15, wis: 12, cha: 10 } };
    raw.classes.push({ class: 'fighter', levels: [lv(1, 5)] } as never);

    expect(messages(raw)).toContain('Ability scores do not meet the multiclass requirements of fighter');
  });

  it('should accept free scores, and rolled scores between 3 and 18', () => {
    const scores = { str: 18, dex: 3, con: 17, int: 20, wis: 4, cha: 9 };
    expect(messages({ ...base(), abilityMethod: 'MANUAL', abilityScores: scores })).not.toContain('Rolled scores must be between 3 and 18');
    expect(messages({ ...base(), abilityMethod: 'ROLLED', abilityScores: scores })).toContain('Rolled scores must be between 3 and 18');
    expect(messages({ ...base(), abilityMethod: 'ROLLED', abilityScores: { ...scores, int: 16 } })).not.toContain('Rolled scores must be between 3 and 18');
  });

  it('should refuse inconsistent levels', () => {
    const gap = base();
    gap.classes[0].levels = [lv(1, 1), lv(3, 2)];
    expect(messages(gap)).toContain('Levels of wizard must go from 1 to 2 without gaps');

    const order = base();
    order.classes[0].levels[1] = lv(2, 3);
    expect(messages(order)).toContain('characterLevel values must go from 1 to 4, once each');

    const early = base();
    early.classes[0].levels = [lv(1, 1)];
    expect(messages(early)).toContain('wizard chooses a subclass at level 2');
  });

  it('should refuse ability score improvements at the wrong level or of the wrong size', () => {
    const wrongLevel = base();
    wrongLevel.classes[0].levels[2] = lv(3, 3, { abilityIncreases: [{ ability: 'str', bonus: 2 }] });
    expect(messages(wrongLevel)).toContain('wizard level 3 does not grant an ability score improvement');

    const tooMuch = base();
    tooMuch.classes[0].levels[3] = lv(4, 4, { abilityIncreases: [{ ability: 'int', bonus: 2 }, { ability: 'wis', bonus: 1 }] });
    expect(messages(tooMuch)).toContain('Ability score improvement is +2 to one score or +1 to two scores');

    const feat = base();
    feat.classes[0].levels[3] = lv(4, 4, { feat: 'grappler' });
    expect(messages(feat)).toContain('Ability scores do not meet the prerequisites of feat grappler');
  });

  it('should refuse answers that do not belong to the character', () => {
    const raw = base();
    raw.choices.push({ choiceId: 10, optionId: 2001 }); // option du style de combat
    raw.choices.push({ choiceId: 20, optionId: 2001 }); // capacité de guerrier
    raw.choices.push({ choiceId: 40, equipment: 'dagger' } as never); // réserve de langues

    const errors = messages(raw);

    expect(errors).toContain('Option 2001 does not belong to choice 10');
    expect(errors).toContain('Choice 20 is not available to this character');
    expect(errors).toContain('Choice 40 is not an equipment choice');
    expect(errors).toContain('Choice 10 allows 2 answer(s), got 3');
  });

  it('should only allow spells of the class list and level', () => {
    const raw = base();
    raw.spells.push({ spell: 'fireball', class: 'wizard' }, { spell: 'cure-wounds', class: 'wizard' });

    const errors = messages(raw);

    expect(errors).toContain('wizard level 4 cannot cast level 3 spells');
    expect(errors).toContain('"cure-wounds" is not on the wizard spell list');
  });

  it('should check ability score generation methods', () => {
    expect(messages({ ...base(), abilityScores: { str: 15, dex: 15, con: 13, int: 15, wis: 12, cha: 10 } }))
      .toContain('Standard array must be 15, 14, 13, 12, 10, 8');
    expect(messages({ ...base(), abilityMethod: 'POINT_BUY', abilityScores: { str: 15, dex: 15, con: 15, int: 15, wis: 8, cha: 8 } }))
      .toContain('Point buy cannot exceed 27 points');
  });

  it('should check personality and items', () => {
    const raw = base();
    raw.personality = [{ kind: 'FLAW', optionId: 70 }] as never;
    raw.items.push({ quantity: 1 } as never);

    const errors = messages(raw);

    expect(errors).toContain('Option 70 is a IDEAL');
    expect(errors).toContain('An item needs an equipment index, a magic item index or a name');
  });

  it('should store magic items, and refuse unknown ones or an item that is both', () => {
    const ok = base();
    ok.items.push({ magicItem: 'cloak-of-elvenkind', quantity: 1, attuned: true } as never);
    const result = run(ok);
    expect(result.errors).toEqual([]);
    expect(result.plan?.items[1]).toMatchObject({ equipmentId: null, magicItemId: 300, attuned: true });

    const bad = base();
    bad.items.push({ magicItem: 'deck-of-many-things', quantity: 1 } as never, { equipment: 'dagger', magicItem: 'cloak-of-elvenkind', quantity: 1 } as never);
    const errors = messages(bad);
    expect(errors.some((e) => e.includes('deck-of-many-things'))).toBe(true);
    expect(errors).toContain('Magic item "cloak-of-elvenkind" does not go on a base item');

    // Une arme magique sur une arme de base : accepté
    const magicDagger = base();
    magicDagger.items.push({ equipment: 'dagger', magicItem: 'weapon-1', quantity: 1 } as never);
    expect(run(magicDagger).errors).toEqual([]);
    expect(run(magicDagger).plan?.items[1]).toMatchObject({ equipmentId: 200, magicItemId: 301 });
  });
});
