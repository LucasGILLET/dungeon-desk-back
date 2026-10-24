import { describe, it, expect } from 'vitest';
import { parseActivation } from '../seed/activation';
import { describeTurn } from '../characters/describe';

describe('parseActivation', () => {
  it('reads the first way of using a feature in its description', () => {
    expect(parseActivation('rage', 'On your turn, you can enter a rage as a bonus action. While raging…')).toBe('BONUS_ACTION');
    expect(parseActivation('uncanny-dodge', 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the damage.')).toBe('REACTION');
    expect(parseActivation('lay-on-hands', 'As an action, you can touch a creature…')).toBe('ACTION');
    expect(parseActivation('patient-defense', 'You can spend 1 ki point to take the Dodge action as a bonus action on your turn.')).toBe('BONUS_ACTION');
    expect(parseActivation('custom', 'Par une action, vous soufflez…')).toBe('ACTION');
    expect(parseActivation('darkvision', 'You can see in dim light…')).toBeNull();
    // Une action de plus, pas une action à dépenser
    expect(parseActivation('action-surge-1-use', 'On your turn, you can take one additional action on top of your regular action.')).toBeNull();
  });
});

const tr = (name: string) => [{ localeCode: 'fr', name }];
const fr = { lang: 'fr', fallback: 'en' };

describe('describeTurn', () => {
  it('lists features (highest tier only), traits and castable spells by action type', async () => {
    let featureWhere: any;
    const db = {
      classFeature: {
        findMany: async ({ where }: any) => {
          featureWhere = where;
          return [
            { index: 'bardic-inspiration-d8', level: 5, activation: 'BONUS_ACTION', translations: tr('Inspiration bardique (d8)') },
            { index: 'bardic-inspiration-d6', level: 1, activation: 'BONUS_ACTION', translations: tr('Inspiration bardique (d6)') },
          ];
        },
      },
      trait: { findMany: async () => [{ index: 'breath-weapon', activation: 'ACTION', translations: tr('Souffle') }] },
      spell: {
        findMany: async ({ where }: any) => [
          { index: 'shield', level: 1, castingTimeUnit: 'REACTION', translations: tr('Bouclier') },
          { index: 'fire-bolt', level: 0, castingTimeUnit: 'ACTION', translations: tr('Trait de feu') },
          { index: 'thaumaturgy', level: 0, castingTimeUnit: 'ACTION', translations: tr('Thaumaturgie') },
        ].filter((s) => where.index.in.includes(s.index)),
      },
    } as any;
    const ctx = {
      edition: { id: 1 }, race: { traitIds: [3] }, subrace: null, traits: new Map(),
      spells: new Map([['shield', { id: 1, level: 1 }], ['fire-bolt', { id: 2, level: 0 }], ['magic-missile', { id: 3, level: 1 }]]),
      classes: new Map([['wizard', { id: 9, subclasses: new Map([['evocation', 4]]), levels: new Map([[5, { spellsKnown: null }]]) }]]),
    } as any;
    const input = {
      classes: [{ class: 'wizard', subclass: 'evocation', levels: [{}, {}, {}, {}, {}] }],
      // Projectile magique : dans le grimoire mais pas préparé
      spells: [{ class: 'wizard', spell: 'shield', prepared: true }, { class: 'wizard', spell: 'magic-missile', prepared: false }, { class: 'wizard', spell: 'fire-bolt' }],
    } as any;
    const granted = [{ index: 'thaumaturgy', level: 0 }] as any;

    const turn = await describeTurn(db, ctx, input, { grantedTraits: [], grantedFeatures: [] }, granted, fr);

    expect(turn.map((x) => [x.activation, x.name])).toEqual([
      ['BONUS_ACTION', 'Inspiration bardique'],
      ['ACTION', 'Souffle'],
      ['ACTION', 'Trait de feu'],
      ['ACTION', 'Thaumaturgie'],
      ['REACTION', 'Bouclier'],
    ]);
    // Capacités de niveau de la sous-classe choisie, hors options d'un choix
    expect(featureWhere.OR[0]).toMatchObject({ classId: 9, level: { lte: 5 }, OR: [{ subclassId: null }, { subclassId: 4 }], parentId: null, choiceItems: { none: {} } });
  });
});
