import { describe, it, expect } from 'vitest';
import { describeArmorClass } from '../characters/describe';

const fr = { lang: 'fr', fallback: 'en' };
const ctx = { edition: { id: 1 } } as any;
const tr = (name: string) => [{ localeCode: 'fr', name }];

const armors: Record<string, any> = {
  'chain-mail': { translations: tr('Cotte de mailles'), armor: { category: 'HEAVY', baseArmorClass: 16, addsDexModifier: false, maxDexModifier: null } },
  shield: { translations: tr('Bouclier'), armor: { category: 'SHIELD', baseArmorClass: 2, addsDexModifier: false, maxDexModifier: null } },
};
const features: Record<string, any> = {
  'fighter-fighting-style-defense': { index: 'fighter-fighting-style-defense', translations: tr('Défense') },
  'draconic-resilience': { index: 'draconic-resilience', translations: tr('Résilience draconique') },
};
const db = {
  equipment: { findMany: async ({ where }: any) => where.index.in.filter((i: string) => armors[i]).map((i: string) => armors[i]) },
  classFeature: { findMany: async ({ where }: any) => where.index.in.map((i: string) => features[i]) },
} as any;

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
});
