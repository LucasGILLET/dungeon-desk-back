import { describe, it, expect } from 'vitest';
import {
  actionKey, parseAlignment, parseAttack, parseDamageModifier, parseDamages, parseHitDice, parseLanguages, parseMultiattack,
  parseSenses, parseSpeeds, parseType, parseUsage, translateLanguages,
} from '../seed/importers/monsters';
import { parseRarity } from '../seed/importers/magicItems';

// Analyse des chaînes du bloc de statistiques du SRD (seed des monstres)

const LANGUAGES = new Map([['Common', 'common'], ['Giant', 'giant'], ['Abyssal', 'abyssal'], ['Deep Speech', 'deep-speech'], ['Undercommon', 'undercommon']]);
const LABELS = {
  creatureSubtypes: {},
  damageNotes: {},
  languageSegments: { 'any two languages': 'deux langues au choix' },
  languagePhrases: [["but can't speak", 'mais ne peut pas parler'], ['understands', 'comprend'], ['and', 'et']] as [string, string][],
  extraLanguages: { 'Giant Eagle': 'Aigle géant' },
};

describe('monster import', () => {
  it('parses speeds, senses and hit dice', () => {
    expect(parseSpeeds({ walk: '10 ft.', fly: '40 ft.', hover: true })).toEqual({ walk: 10, fly: 40, hover: true });
    expect(parseSenses({ blindsight: '60 ft. (blind beyond this radius)', passive_perception: 10 })).toEqual({ blindsight: 60, blindBeyond: true });
    expect(parseHitDice('18d10+36')).toEqual({ hitDiceCount: 18, hitDieSize: 10, hitPointBonus: 36 });
    expect(parseHitDice('1d4-1')).toMatchObject({ hitPointBonus: -1 });
  });

  it('splits swarms into a type and a size', () => {
    expect(parseType('swarm of Tiny beasts')).toEqual({ creatureType: 'beast', swarmOfSize: 'TINY' });
    expect(parseType('dragon')).toEqual({ creatureType: 'dragon', swarmOfSize: null });
  });

  it('expands alignment ranges', () => {
    expect(parseAlignment('unaligned')).toEqual({ isUnaligned: true, alignments: [] });
    expect(parseAlignment('any alignment').alignments).toHaveLength(9);
    expect(parseAlignment('any non-good alignment').alignments).toEqual(['lawful-neutral', 'neutral', 'chaotic-neutral', 'lawful-evil', 'neutral-evil', 'chaotic-evil']);
    expect(parseAlignment('any chaotic alignment').alignments).toEqual(['chaotic-good', 'chaotic-neutral', 'chaotic-evil']);
    expect(parseAlignment('neutral good (50%) or neutral evil (50%)').alignments).toEqual(['neutral-good', 'neutral-evil']);
    expect(() => parseAlignment('mostly harmless')).toThrow();
  });

  it('splits damage modifiers with their precision', () => {
    expect(parseDamageModifier('fire')).toEqual([{ damageType: 'fire', nonMagicalOnly: false, note: null }]);
    const silvered = parseDamageModifier("bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered");
    expect(silvered.map((m) => m.damageType)).toEqual(['bludgeoning', 'piercing', 'slashing']);
    expect(silvered[0]).toMatchObject({ nonMagicalOnly: true, note: "that aren't silvered" });
    expect(parseDamageModifier('piercing from magic weapons wielded by good creatures'))
      .toEqual([{ damageType: 'piercing', nonMagicalOnly: false, note: 'from magic weapons wielded by good creatures' }]);
    expect(parseDamageModifier('damage from spells')).toEqual([{ damageType: null, nonMagicalOnly: false, note: 'damage from spells' }]);
  });

  it('links spoken and understood languages', () => {
    const parsed = parseLanguages("Giant Eagle, understands Common and Abyssal but can't speak, telepathy 120 ft.", LANGUAGES, ['Giant Eagle']);
    expect(parsed.telepathyFt).toBe(120);
    expect(parsed.languages).toEqual([{ index: 'common', understandOnly: true }, { index: 'abyssal', understandOnly: true }]);
    // "Undercommon" ne contient pas la langue "Common"
    expect(parseLanguages('Deep Speech, Undercommon', LANGUAGES, []).languages.map((l) => l.index)).toEqual(['deep-speech', 'undercommon']);
  });

  it('translates the languages line', () => {
    const names = new Map([['Common', 'Commun'], ['Abyssal', 'Abyssal']]);
    expect(translateLanguages("Giant Eagle, understands Common and Abyssal but can't speak", LABELS, names))
      .toBe('Aigle géant, comprend Commun et Abyssal mais ne peut pas parler');
    expect(translateLanguages('Common, telepathy 120 ft.', LABELS, names)).toBe('Commun, télépathie à 36 m');
    expect(translateLanguages('any two languages', LABELS, names)).toBe('deux langues au choix');
  });

  it('reads attacks, usage and damage alternatives', () => {
    expect(parseAttack('Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target.'))
      .toEqual({ attackType: 'MELEE_OR_RANGED_WEAPON', reachFt: 5, normalRangeFt: 20, longRangeFt: 60 });
    expect(parseAttack('The dragon exhales fire in a 60-foot cone.').attackType).toBeNull();
    expect(parseUsage({ type: 'recharge on roll', dice: '1d6', min_value: 5 })).toEqual({ type: 'recharge', dice: '1d6', minValue: 5 });
    expect(parseUsage({ type: 'recharge after rest', rest_types: ['short', 'long'] })).toEqual({ type: 'per_rest', rests: ['short', 'long'] });

    const damage = (dice: string, type: string) => ({ damage_dice: dice, damage_type: { index: type } });
    const rows = parseDamages({ damage: [damage('2d6 + 5', 'slashing'), { choose: 1, from: { options: [damage('1d6', 'lightning'), damage('1d6', 'thunder')] } }] });
    expect(rows).toEqual([
      { dice: '2d6+5', damageType: 'slashing', alternativeGroup: null },
      { dice: '1d6', damageType: 'lightning', alternativeGroup: 1 },
      { dice: '1d6', damageType: 'thunder', alternativeGroup: 1 },
    ]);
  });

  it('reads multiattack steps and their alternatives', () => {
    expect(parseMultiattack({ actions: [{ action_name: 'Bite', count: 1 }, { action_name: 'Bite', count: 'Number of Heads' }] }))
      .toEqual([{ name: 'Bite', count: 1, alternativeGroup: 1 }]);
    const options = { from: { options: [
      { option_type: 'multiple', items: [{ action_name: 'Scimitar', count: 2 }, { action_name: 'Dagger', count: 1 }] },
      { option_type: 'action', action_name: 'Dagger', count: 2 },
    ] } };
    expect(parseMultiattack({ action_options: options }).map((s) => s.alternativeGroup)).toEqual([1, 1, 2]);
    expect(actionKey('Claws')).toBe(actionKey('Claw (Oni Form Only)'));
  });

  it('maps magic item rarities', () => {
    expect(parseRarity('Very Rare')).toBe('VERY_RARE');
    expect(() => parseRarity('Mythic')).toThrow();
  });
});
