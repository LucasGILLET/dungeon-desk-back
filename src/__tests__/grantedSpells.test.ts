import { describe, it, expect } from 'vitest';
import { describeGrantedSpells, describeResistances } from '../characters/describe';

const fr = { lang: 'fr', fallback: 'en' };
const tr = (name: string) => [{ localeCode: 'fr', name }];
const spell = (index: string, level: number, name: string) => ({ index, level, translations: tr(name) });
const infernal = { index: 'infernal-legacy', translations: tr('Ascendance infernale'), spellAbility: { index: 'cha' } };

const db = {
  // La base filtre sur le niveau du personnage : on le reproduit
  traitSpell: {
    findMany: async ({ where }: any) => [
      { requiredCharacterLevel: 1, castAtLevel: null, oncePerLongRest: false, spell: spell('thaumaturgy', 0, 'Thaumaturgie'), trait: infernal },
      { requiredCharacterLevel: 3, castAtLevel: 2, oncePerLongRest: true, spell: spell('hellish-rebuke', 1, 'Représailles infernales'), trait: infernal },
    ].filter((s) => s.requiredCharacterLevel <= where.requiredCharacterLevel.lte),
  },
  choiceOptionItem: { findMany: async () => [] },
  subclassSpell: {
    findMany: async () => [
      { requiredClassLevel: 1, requiredFeature: null, spell: spell('bless', 1, 'Bénédiction'), subclass: { index: 'life', translations: tr('Domaine de la Vie'), class: { index: 'cleric' } } },
      { requiredClassLevel: 5, requiredFeature: null, spell: spell('revivify', 3, 'Retour à la vie'), subclass: { index: 'life', translations: tr('Domaine de la Vie'), class: { index: 'cleric' } } },
      { requiredClassLevel: 3, requiredFeature: { index: 'circle-of-the-land-forest' }, spell: spell('spider-climb', 2, 'Pattes d\'araignée'), subclass: { index: 'life', translations: tr('Domaine de la Vie'), class: { index: 'cleric' } } },
    ],
  },
  traitDamageResistance: { findMany: async () => [{ damageType: { index: 'fire', translations: tr('Feu') }, trait: { translations: tr('Résistance infernale') } }] },
} as any;
const ctx = { edition: { id: 1 }, race: { traitIds: [7] }, subrace: null, traits: new Map() } as any;
const sheet = (level: number) => ({ level, proficiencyBonus: 2, abilityScores: { cha: { modifier: 3 }, wis: { modifier: 2 } }, grantedTraits: [], grantedFeatures: [] });
const spellcasting = [{ class: 'cleric', ability: 'wis', saveDC: 12, attackBonus: 4 }];

describe('describeGrantedSpells', () => {
  it('gives the spells of a racial trait from the character level, with the ability of the trait', async () => {
    const input = { classes: [{ class: 'fighter', subclass: null, levels: [{}, {}, {}] }], choices: [] } as any;
    const spells = await describeGrantedSpells(db, ctx, input, sheet(3), [], fr);

    expect(spells).toEqual([
      { index: 'thaumaturgy', name: 'Thaumaturgie', level: 0, source: 'Ascendance infernale', kind: 'TRAIT', ability: 'cha', saveDC: 13, attackBonus: 5, castAtLevel: null, oncePerLongRest: false },
      { index: 'hellish-rebuke', name: 'Représailles infernales', level: 1, source: 'Ascendance infernale', kind: 'TRAIT', ability: 'cha', saveDC: 13, attackBonus: 5, castAtLevel: 2, oncePerLongRest: true },
    ]);
    expect(await describeGrantedSpells(db, ctx, input, sheet(2), [], fr)).toHaveLength(1);
  });

  it('adds the subclass spells reached by the class level, with the casting values of the class', async () => {
    const input = { classes: [{ class: 'cleric', subclass: 'life', levels: [{}, {}, {}] }], choices: [] } as any;
    const spells = await describeGrantedSpells(db, { ...ctx, race: null }, input, sheet(3), spellcasting, fr);

    // Retour à la vie : niveau 5 ; Pattes d'araignée : terrain non choisi
    expect(spells).toEqual([expect.objectContaining({ index: 'bless', source: 'Domaine de la Vie', kind: 'SUBCLASS', ability: 'wis', saveDC: 12 })]);
  });
});

describe('describeResistances', () => {
  it('lists the damage resistances of the traits with their source', async () => {
    expect(await describeResistances(db, ctx, { grantedTraits: [] }, fr)).toEqual([{ damageType: 'fire', name: 'Feu', source: 'Résistance infernale' }]);
  });
});
