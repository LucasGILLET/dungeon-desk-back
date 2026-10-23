import { describe, it, expect } from 'vitest';
import { describeArmorClass } from '../characters/describe';

const fr = { lang: 'fr', fallback: 'en' };
const ctx = { edition: { id: 1 } } as any;
const tr = (name: string) => [{ localeCode: 'fr', name }];

const armors: Record<string, any> = {
  'chain-mail': { index: 'chain-mail', translations: tr('Cotte de mailles'), armor: { category: 'HEAVY', baseArmorClass: 16, addsDexModifier: false, maxDexModifier: null } },
  shield: { index: 'shield', translations: tr('Bouclier'), armor: { category: 'SHIELD', baseArmorClass: 2, addsDexModifier: false, maxDexModifier: null } },
};
const features: Record<string, any> = {
  'fighter-fighting-style-defense': { index: 'fighter-fighting-style-defense', translations: tr('Défense') },
  'draconic-resilience': { index: 'draconic-resilience', translations: tr('Résilience draconique') },
};
const db = {
  equipment: { findMany: async ({ where }: any) => where.index.in.filter((i: string) => armors[i]).map((i: string) => armors[i]) },
  classFeature: { findMany: async ({ where }: any) => where.index.in.map((i: string) => features[i]) },
  magicItem: { findMany: async ({ where }: any) => where.index.in.map((i: string) => MAGIC[i]).filter(Boolean) },
} as any;
const MAGIC: Record<string, any> = {
  'armor-1': { index: 'armor-1', weaponBonus: null, armorBonus: 1, requiresAttunement: false, translations: tr('Armure, +1'), equipmentCategory: { index: 'armor' } },
  'ring-of-protection': { index: 'ring-of-protection', weaponBonus: null, armorBonus: 1, requiresAttunement: true, translations: tr('Anneau de protection'), equipmentCategory: { index: 'ring' } },
  'bracers-of-defense': { index: 'bracers-of-defense', weaponBonus: null, armorBonus: 2, requiresAttunement: true, translations: tr('Bracelets de défense'), equipmentCategory: { index: 'wondrous-items' } },
};

const sheet = (dex: number, grantedFeatures: string[] = []) => ({
  abilityScores: { dex: { modifier: dex }, con: { modifier: 0 }, wis: { modifier: 0 } },
  grantedFeatures,
});
const character = (cls: string, items: string[], subclass?: string) => ({
  classes: [{ class: cls, subclass, levels: [{ level: 1, characterLevel: 1 }] }],
  items: items.map((equipment) => ({ equipment, equipped: true })),
}) as any;

describe('describeArmorClass', () => {
  it('ajoute 1 en armure avec le style de combat Défense', async () => {
    const ac = await describeArmorClass(db, ctx, character('fighter', ['chain-mail', 'shield']), sheet(1, ['fighter-fighting-style-defense']), fr);
    expect(ac).toEqual({ value: 19, detail: 'Cotte de mailles 16 + 1 (Défense) + Bouclier 2' });
  });

  it("n'ajoute rien avec le style Défense sans armure", async () => {
    const ac = await describeArmorClass(db, ctx, character('fighter', []), sheet(2, ['fighter-fighting-style-defense']), fr);
    expect(ac).toEqual({ value: 12, detail: '10 + 2 (DEX)' });
  });

  it("n'ajoute rien en armure sans le style Défense", async () => {
    const ac = await describeArmorClass(db, ctx, character('fighter', ['chain-mail']), sheet(1), fr);
    expect(ac.value).toBe(16);
  });

  it("applique la résilience draconique de l'ensorceleur sans armure", async () => {
    const ac = await describeArmorClass(db, ctx, character('sorcerer', [], 'draconic'), sheet(2), fr);
    expect(ac).toEqual({ value: 15, detail: '13 + 2 (DEX, Résilience draconique)' });
  });

  it('adds the bonus of a magic armor, and of an attuned ring of protection', async () => {
    const items = [
      { equipment: 'chain-mail', magicItem: 'armor-1', equipped: true },
      { magicItem: 'ring-of-protection', equipped: true, attuned: true },
    ];
    const ac = await describeArmorClass(db, ctx, { classes: [{ class: 'fighter', levels: [] }], items } as any, sheet(1), fr);
    expect(ac).toEqual({ value: 18, detail: 'Cotte de mailles +1 17 + 1 (Anneau de protection)' });

    // Anneau non harmonisé : sans effet
    const notAttuned = await describeArmorClass(db, ctx, { classes: [], items: [items[0], { ...items[1], attuned: false }] } as any, sheet(1), fr);
    expect(notAttuned.value).toBe(17);
  });

  it('counts bracers of defense only without armor or shield', async () => {
    const bracers = { magicItem: 'bracers-of-defense', equipped: true, attuned: true };
    expect((await describeArmorClass(db, ctx, { classes: [], items: [bracers] } as any, sheet(2), fr)).value).toBe(14);
    // Avec un bouclier : 10 + 2 (DEX) + 2 (bouclier), sans les bracelets
    const withShield = await describeArmorClass(db, ctx, { classes: [], items: [bracers, { equipment: 'shield', equipped: true }] } as any, sheet(2), fr);
    expect(withShield).toEqual({ value: 14, detail: '10 + 2 (DEX) + Bouclier 2' });
  });
});
