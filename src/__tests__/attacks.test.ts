import { describe, it, expect } from 'vitest';
import { describeAttacks } from '../characters/describe';

const fr = { lang: 'fr', fallback: 'en' };
const tr = (name: string) => [{ localeCode: 'fr', name }];
const prop = (index: string, name: string) => ({ property: { index, translations: tr(name) } });
const slashing = { index: 'slashing', translations: tr('Tranchant') };
const piercing = { index: 'piercing', translations: tr('Perforant') };

// Catégories : 1 = armes courantes, 2 = armes de guerre
const WEAPONS: Record<string, any> = {
  longsword: { id: 10, index: 'longsword', translations: tr('Épée longue'), categories: [{ categoryId: 2 }],
    weapon: { range: 'MELEE', damageDice: '1d8', versatileDice: '1d10', normalRangeFt: null, longRangeFt: null, damageType: slashing, properties: [prop('versatile', 'Polyvalente')] } },
  rapier: { id: 11, index: 'rapier', translations: tr('Rapière'), categories: [{ categoryId: 2 }],
    weapon: { range: 'MELEE', damageDice: '1d8', versatileDice: null, normalRangeFt: null, longRangeFt: null, damageType: piercing, properties: [prop('finesse', 'Finesse')] } },
  longbow: { id: 12, index: 'longbow', translations: tr('Arc long'), categories: [{ categoryId: 2 }],
    weapon: { range: 'RANGED', damageDice: '1d8', versatileDice: null, normalRangeFt: 150, longRangeFt: 600, damageType: piercing, properties: [prop('ammunition', 'Munitions'), prop('two-handed', 'À deux mains')] } },
};
const SPELLS: Record<string, any> = {
  'fire-bolt': { index: 'fire-bolt', attackType: 'RANGED', rangeFt: 120, damageScaling: { by: 'character_level', values: { 1: '1d10', 5: '2d10', 11: '3d10' } },
    translations: tr('Trait de feu'), damageTypes: [{ damageType: { index: 'fire', translations: tr('Feu') } }], saveAbility: null },
  'sacred-flame': { index: 'sacred-flame', attackType: null, rangeFt: 60, damageScaling: { by: 'character_level', values: { 1: '1d8', 5: '2d8' } },
    translations: tr('Flamme sacrée'), damageTypes: [{ damageType: { index: 'radiant', translations: tr('Radiant') } }], saveAbility: { index: 'dex' } },
};
const db = {
  equipment: { findMany: async ({ where }: any) => where.index.in.filter((i: string) => WEAPONS[i]).map((i: string) => WEAPONS[i]) },
  // Maîtrise des armes courantes (catégorie 1) et de l'épée longue seulement
  proficiency: { findMany: async () => [{ equipmentId: null, equipmentCategoryId: 1 }, { equipmentId: 10, equipmentCategoryId: null }] },
  spell: { findMany: async ({ where }: any) => where.index.in.map((i: string) => SPELLS[i]) },
} as any;
const ctx = { edition: { id: 1 }, spells: new Map([['fire-bolt', { id: 1, level: 0 }], ['sacred-flame', { id: 2, level: 0 }]]) } as any;

const sheet = (grantedFeatures: string[] = [], level = 5) => ({
  level, proficiencyBonus: 3, grantedFeatures,
  abilityScores: { str: { modifier: 3 }, dex: { modifier: 4 }, wis: { modifier: 2 } },
});
const character = (items: { equipment: string; equipped?: boolean }[], spells: { spell: string; class: string }[] = []) =>
  ({ classes: [{ class: 'fighter' }], items, spells }) as any;
const spellcasting = [{ class: 'cleric', ability: 'wis', saveDC: 13, attackBonus: 5 }];

describe('describeAttacks', () => {
  it('uses Strength in melee, the best ability with finesse, and proficiency only when the character has it', async () => {
    const attacks = await describeAttacks(db, ctx, character([{ equipment: 'longsword', equipped: true }, { equipment: 'rapier' }]), sheet(), { proficiencies: [] }, [], fr);

    expect(attacks[0]).toMatchObject({ name: 'Épée longue', attackBonus: 6, damage: '1d8 + 3 tranchant', versatileDamage: '1d10 + 3 tranchant', equipped: true });
    // Rapière : DEX (4) mais pas de maîtrise des armes de guerre
    expect(attacks[1]).toMatchObject({ name: 'Rapière', attackBonus: 4, damage: '1d8 + 4 perforant', equipped: false });
  });

  it('adds Archery to ranged attacks and Dueling to a single one-handed melee weapon', async () => {
    const items = [{ equipment: 'longsword', equipped: true }, { equipment: 'longbow' }];
    const attacks = await describeAttacks(db, ctx, character(items), sheet(['fighter-fighting-style-archery', 'fighter-fighting-style-dueling']), { proficiencies: [] }, [], fr);

    expect(attacks.find((a) => a.index === 'longsword')).toMatchObject({ attackBonus: 6, damage: '1d8 + 5 tranchant' });
    // Arc long sans maîtrise : DEX 4 + Archerie 2
    expect(attacks.find((a) => a.index === 'longbow')).toMatchObject({ attackBonus: 6, damage: '1d8 + 4 perforant', range: '45 / 180 m' });
  });

  it('scales attack cantrips with the character level, and gives the save DC of the others', async () => {
    const spells = [{ spell: 'fire-bolt', class: 'cleric' }, { spell: 'sacred-flame', class: 'cleric' }];
    const attacks = await describeAttacks(db, ctx, character([], spells), sheet([], 5), { proficiencies: [] }, spellcasting, fr);

    expect(attacks).toEqual([
      expect.objectContaining({ kind: 'SPELL', name: 'Trait de feu', attackBonus: 5, save: null, damage: '2d10 feu', range: '36 m' }),
      expect.objectContaining({ kind: 'SPELL', name: 'Flamme sacrée', attackBonus: null, save: { dc: 13, ability: 'dex' }, damage: '2d8 radiant' }),
    ]);
  });
});
