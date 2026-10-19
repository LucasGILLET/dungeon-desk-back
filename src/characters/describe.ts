// Description traduite des choix accessibles à un personnage, pour que le front
// les affiche sans connaître les règles : d'où vient le choix, combien en
// prendre, les options (avec ce qu'elles donnent) ou les candidats d'une
// réserve. Calcule aussi l'équipement de départ qui découle des réponses.
import { Prisma, PrismaClient } from '@prisma/client';
import { LangContext, pick } from '../srd/lang';
import type { CharacterInput } from './input';
import type { RulesContext } from './rules';

type Db = PrismaClient | Prisma.TransactionClient;
type Named = { translations: { localeCode: string; name: string }[] } | null;

const t = { orderBy: { localeCode: 'asc' as const } };
const named = { select: { index: true, translations: t } } as const;

const CHOICE_INCLUDE = {
  translations: t,
  class: named,
  subclass: named,
  classFeature: { select: { index: true, level: true, translations: t } },
  race: named,
  subrace: named,
  trait: named,
  background: named,
  parentOption: { select: { choiceId: true, position: true } },
  poolCategory: named,
  options: {
    orderBy: { position: 'asc' },
    include: {
      nestedChoice: { select: { id: true, translations: t } },
      items: {
        include: {
          proficiency: named, equipment: named, equipmentCategory: named, classFeature: named, creatureType: named,
          terrain: named, language: named, abilityScore: named, spell: named, trait: named,
        },
      },
    },
  },
} satisfies Prisma.ChoiceInclude;

type ChoiceRow = Prisma.ChoiceGetPayload<{ include: typeof CHOICE_INCLUDE }>;
type ItemRow = ChoiceRow['options'][number]['items'][number];

const ITEM_TYPES = ['proficiency', 'equipment', 'equipmentCategory', 'classFeature', 'creatureType', 'terrain', 'language', 'abilityScore', 'spell', 'trait'] as const;
const CURRENCY_LABELS: Record<string, string> = { CP: 'pc', SP: 'pa', EP: 'pe', GP: 'po', PP: 'pp' };

export interface ChoiceItemDetail {
  type: (typeof ITEM_TYPES)[number] | 'currency';
  index: string | null;
  name: string;
  quantity: number;
  bonus: number | null;
  description: string | null; // capacité, trait ou sort : texte de règle
}

export interface ChoiceDetail {
  id: number;
  kind: string;
  choose: number;
  description: string;
  source: { type: string; index: string | null; name: string | null };
  parentOptionId: number | null;
  options: { id: number; label: string; items: ChoiceItemDetail[]; nestedChoiceId: number | null }[];
  pool: { type: string; category: { index: string; name: string } | null; candidates: { index: string; name: string }[] } | null;
}

export interface StartingEquipment {
  items: { equipment: string | null; name: string | null; quantity: number }[];
  currencies: Record<string, number>;
}

// Ordre d'affichage : race, sous-race, traits, historique, classe, capacités par niveau, sous-classe
const SOURCE_RANK = ['race', 'subrace', 'trait', 'background', 'class', 'classFeature', 'subclass'];

export async function describeChoices(db: Db, ctx: RulesContext, input: CharacterInput, choiceIds: number[], lang: LangContext) {
  const name = (x: Named) => (x ? pick(x.translations, lang).name : null);
  const rows = await db.choice.findMany({ where: { id: { in: choiceIds } }, include: CHOICE_INCLUDE });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const item = (i: ItemRow): ChoiceItemDetail => {
    if (i.currencyAmount != null) {
      return { type: 'currency', index: i.currency, name: `${i.currencyAmount} ${CURRENCY_LABELS[i.currency!] ?? i.currency}`, quantity: i.currencyAmount, bonus: null, description: null };
    }
    const type = ITEM_TYPES.find((k) => i[k]) ?? 'equipment';
    const target = i[type] as { index: string; translations: { localeCode: string; name: string; description?: string | null }[] } | null;
    const description = target ? pick(target.translations, lang).description ?? null : null;
    return { type, index: target?.index ?? null, name: name(target) ?? '?', quantity: i.quantity, bonus: i.bonus, description };
  };
  const label = (items: ChoiceItemDetail[]) => items
    .map((i) => (i.bonus ? `${i.name} +${i.bonus}` : i.quantity > 1 && i.type !== 'currency' ? `${i.quantity} × ${i.name}` : i.name))
    .join(' + ');

  // Candidats des réserves : toutes les langues, ou les objets de la catégorie
  const needsLanguages = rows.some((r) => r.pool === 'ANY_LANGUAGE');
  const languages = needsLanguages && ctx.edition
    ? await db.language.findMany({ where: { editionId: ctx.edition.id }, select: { index: true, translations: t }, orderBy: { index: 'asc' } })
    : [];
  const categoryIds = rows.map((r) => r.poolCategoryId).filter((v): v is number => v != null);
  const members = categoryIds.length
    ? await db.equipmentCategoryItem.findMany({ where: { categoryId: { in: categoryIds } }, select: { categoryId: true, equipment: named } })
    : [];

  const source = (r: ChoiceRow): ChoiceDetail['source'] => {
    for (const type of SOURCE_RANK) {
      const owner = r[type as keyof ChoiceRow] as { index: string; translations: { localeCode: string; name: string }[] } | null;
      if (owner) return { type, index: owner.index, name: name(owner) };
    }
    return { type: 'option', index: null, name: null };
  };
  // Clé de tri : les sous-choix suivent l'option qui les ouvre
  const sortKey = (r: ChoiceRow, depth = 0): string => {
    if (r.parentOption && depth < 5) {
      const parent = byId.get(r.parentOption.choiceId);
      if (parent) return `${sortKey(parent, depth + 1)}.${String(r.parentOption.position).padStart(3, '0')}`;
    }
    const s = source(r);
    const level = r.classFeature?.level ?? 0;
    return `${SOURCE_RANK.indexOf(s.type)}.${String(level).padStart(2, '0')}.${String(r.position).padStart(3, '0')}.${String(r.id).padStart(6, '0')}`;
  };

  const details: ChoiceDetail[] = [...rows].sort((a, b) => sortKey(a).localeCompare(sortKey(b))).map((r) => ({
    id: r.id,
    kind: r.kind,
    choose: r.choose,
    description: pick(r.translations, lang).description,
    source: source(r),
    parentOptionId: r.parentOptionId,
    options: r.options.map((o) => {
      const items = o.items.map(item);
      const nested = o.nestedChoice ? pick(o.nestedChoice.translations, lang).description : null;
      return { id: o.id, label: [label(items), nested].filter(Boolean).join(' + ') || '…', items, nestedChoiceId: o.nestedChoice?.id ?? null };
    }),
    pool: r.pool && {
      type: r.pool,
      category: r.poolCategory && { index: r.poolCategory.index, name: name(r.poolCategory)! },
      candidates: r.pool === 'ANY_LANGUAGE'
        ? languages.map((l) => ({ index: l.index, name: name(l)! }))
        : members.filter((m) => m.categoryId === r.poolCategoryId).map((m) => ({ index: m.equipment.index, name: name(m.equipment)! })),
    },
  }));

  return { choices: details, startingEquipment: await startingEquipment(db, ctx, input, byId, item) };
}

// Équipement de départ : fixe (classe de départ, historique) + options choisies
async function startingEquipment(
  db: Db, ctx: RulesContext, input: CharacterInput, choices: Map<number, ChoiceRow>, item: (i: ItemRow) => ChoiceItemDetail,
): Promise<StartingEquipment> {
  const result: StartingEquipment = { items: [], currencies: {} };
  const addItem = (equipment: string | null, name: string | null, quantity: number) => {
    const same = result.items.find((i) => i.equipment === equipment && i.name === name);
    if (same) same.quantity += quantity;
    else result.items.push({ equipment, name, quantity });
  };
  const firstClass = ctx.classes.get(input.classes[0]?.class ?? '');
  const fixed = [
    ...(firstClass ? await db.classStartingEquipment.findMany({ where: { classId: firstClass.id }, include: { equipment: { select: { index: true } } } }) : []),
    ...(ctx.background ? await db.backgroundStartingEquipment.findMany({ where: { backgroundId: ctx.background.id }, include: { equipment: { select: { index: true } } } }) : []),
  ];
  for (const f of fixed) addItem(f.equipment.index, null, f.quantity);

  for (const answer of input.choices) {
    const choice = choices.get(answer.choiceId);
    if (!choice || choice.kind !== 'STARTING_EQUIPMENT') continue;
    if (answer.equipment) { addItem(answer.equipment, null, 1); continue; }
    const option = choice.options.find((o) => o.id === answer.optionId);
    for (const raw of option?.items ?? []) {
      const i = item(raw);
      if (i.type === 'currency') result.currencies[i.index!] = (result.currencies[i.index!] ?? 0) + i.quantity;
      else if (i.type === 'equipment') addItem(i.index, null, i.quantity);
      // "une arme de guerre au choix" à l'intérieur d'un lot : objet libre à préciser
      else if (i.type === 'equipmentCategory') addItem(null, `${i.name} (au choix)`, i.quantity);
    }
  }
  return result;
}

export interface KnownProficiencies {
  proficiencies: { index: string; name: string; type: string }[];
  expertise: { index: string; name: string }[];
  languages: { index: string; name: string }[];
}

// Maîtrises et langues du personnage, toutes sources confondues : classe de
// départ (ou maîtrises de multiclassage), historique, traits, réponses aux choix
export async function describeProficiencies(db: Db, ctx: RulesContext, input: CharacterInput, lang: LangContext): Promise<KnownProficiencies> {
  const name = (x: Named) => (x ? pick(x.translations, lang).name : '?');
  const prof = { select: { index: true, type: true, translations: t } } as const;
  const classIds = input.classes.map((c) => ctx.classes.get(c.class)?.id).filter((v): v is number => v != null);
  const optionIds = input.choices.map((c) => c.optionId).filter((v): v is number => v != null);
  const chosen = new Set(optionIds);
  const grantedTraits = [...ctx.choices.values()].flatMap((c) => c.options.filter((o) => chosen.has(o.id)).flatMap((o) => o.items.map((i) => i.traitId)))
    .filter((v): v is number => v != null);
  const traitIds = [...(ctx.race?.traitIds ?? []), ...(ctx.subrace?.traitIds ?? []), ...grantedTraits];

  const [classProfs, multiclassProfs, backgroundProfs, traitProfs, chosenItems, raceLanguages, poolLanguages] = await Promise.all([
    classIds[0] ? db.classProficiency.findMany({ where: { classId: classIds[0] }, select: { proficiency: prof } }) : [],
    classIds.length > 1 ? db.classMulticlassProficiency.findMany({ where: { classId: { in: classIds.slice(1) } }, select: { proficiency: prof } }) : [],
    ctx.background ? db.backgroundProficiency.findMany({ where: { backgroundId: ctx.background.id }, select: { proficiency: prof } }) : [],
    db.traitProficiency.findMany({ where: { traitId: { in: traitIds } }, select: { proficiency: prof } }),
    db.choiceOptionItem.findMany({
      where: { optionId: { in: optionIds }, OR: [{ proficiencyId: { not: null } }, { languageId: { not: null } }] },
      select: { proficiency: prof, language: named, option: { select: { choice: { select: { kind: true } } } } },
    }),
    ctx.race ? db.raceLanguage.findMany({ where: { raceId: ctx.race.id }, select: { language: named } }) : [],
    db.language.findMany({ where: { id: { in: input.choices.map((c) => (c.language ? ctx.languages.get(c.language) : undefined)).filter((v): v is number => v != null) } }, select: named.select }),
  ]);

  const result: KnownProficiencies = { proficiencies: [], expertise: [], languages: [] };
  const addProf = (p: { index: string; type: string; translations: { localeCode: string; name: string }[] }) => {
    if (!result.proficiencies.some((x) => x.index === p.index)) result.proficiencies.push({ index: p.index, name: name(p), type: p.type });
  };
  const addLanguage = (l: { index: string; translations: { localeCode: string; name: string }[] }) => {
    if (!result.languages.some((x) => x.index === l.index)) result.languages.push({ index: l.index, name: name(l) });
  };
  for (const row of [...classProfs, ...multiclassProfs, ...backgroundProfs, ...traitProfs]) addProf(row.proficiency);
  for (const row of chosenItems) {
    if (row.language) addLanguage(row.language);
    if (!row.proficiency) continue;
    if (row.option.choice.kind === 'EXPERTISE') {
      if (!result.expertise.some((x) => x.index === row.proficiency!.index)) result.expertise.push({ index: row.proficiency.index, name: name(row.proficiency) });
    } else {
      addProf(row.proficiency);
    }
  }
  for (const row of raceLanguages) addLanguage(row.language);
  for (const l of poolLanguages) addLanguage(l);
  return result;
}

export interface Resources {
  hitDice: { class: string; die: number; total: number; used: number }[];
  // Emplacements de sorts par niveau de sort (index 0 = niveau 1), multiclassage compris
  spellSlots: number[];
  // Emplacements de pacte de l'occultiste
  pactSlots: { level: number; count: number } | null;
  spellcasting: { class: string; ability: string; saveDC: number; attackBonus: number }[];
}

const CASTER_WEIGHT: Record<string, (level: number) => number> = {
  FULL: (l) => l,
  HALF: (l) => Math.floor(l / 2),
  THIRD: (l) => Math.floor(l / 3),
};

// Dés de vie, emplacements de sorts et caractéristiques d'incantation. Règle
// de multiclassage : niveau de lanceur = niveaux complets + moitié (demi-
// lanceurs) + tiers (sous-classes), lu dans la table d'un lanceur complet.
export async function describeResources(
  db: Db, ctx: RulesContext, input: CharacterInput, sheet: { proficiencyBonus: number; abilityScores: Record<string, { modifier: number }> },
): Promise<Resources> {
  const owned = input.classes
    .map((c) => ({ input: c, rule: ctx.classes.get(c.class) }))
    .filter((c): c is { input: CharacterInput['classes'][number]; rule: NonNullable<typeof c.rule> } => !!c.rule);
  const hitDice = owned.map(({ input: c, rule }) => ({ class: c.class, die: rule.hitDie, total: c.levels.length, used: c.hitDiceUsed }));

  const classIds = owned.map((c) => c.rule.id);
  const [spellcasting, subclasses] = await Promise.all([
    db.classSpellcasting.findMany({ where: { classId: { in: classIds } }, select: { classId: true, casterType: true, abilityScore: { select: { index: true } } } }),
    db.subclass.findMany({ where: { index: { in: owned.map((c) => c.input.subclass).filter((s): s is string => !!s) }, editionId: ctx.edition?.id, casterType: { not: null } }, select: { index: true, classId: true, casterType: true } }),
  ]);

  // Lanceurs (hors pacte), avec leur poids dans le niveau de lanceur
  const casters = owned.flatMap(({ input: c, rule }) => {
    const own = spellcasting.find((s) => s.classId === rule.id);
    const sub = subclasses.find((s) => s.classId === rule.id && s.index === c.subclass);
    const type = own?.casterType ?? sub?.casterType;
    return type && type !== 'PACT' ? [{ classId: rule.id, level: c.levels.length, type }] : [];
  });

  let spellSlots: number[] = [];
  if (casters.length) {
    const single = casters.length === 1 && casters[0]!.type !== 'THIRD';
    const casterLevel = single ? casters[0]!.level : casters.reduce((sum, c) => sum + CASTER_WEIGHT[c.type]!(c.level), 0);
    const tableClassId = single
      ? casters[0]!.classId
      : (await db.classSpellcasting.findFirst({ where: { casterType: 'FULL', class: { editionId: ctx.edition?.id } }, select: { classId: true } }))?.classId;
    if (tableClassId && casterLevel > 0) {
      const level = await db.classLevel.findUnique({ where: { classId_level: { classId: tableClassId, level: casterLevel } }, include: { spellSlots: true } });
      spellSlots = Array.from({ length: 9 }, (_, i) => level?.spellSlots.find((s) => s.spellLevel === i + 1)?.slots ?? 0);
      while (spellSlots.length && spellSlots[spellSlots.length - 1] === 0) spellSlots.pop();
    }
  }

  let pactSlots: Resources['pactSlots'] = null;
  const pact = owned.find(({ rule }) => spellcasting.find((s) => s.classId === rule.id)?.casterType === 'PACT');
  if (pact) {
    const level = await db.classLevel.findUnique({ where: { classId_level: { classId: pact.rule.id, level: pact.input.levels.length } }, include: { spellSlots: true } });
    const slots = (level?.spellSlots ?? []).filter((s) => s.slots > 0);
    if (slots.length) {
      const top = slots.reduce((a, b) => (b.spellLevel > a.spellLevel ? b : a));
      pactSlots = { level: top.spellLevel, count: top.slots };
    }
  }

  const spellcastingInfo = owned.flatMap(({ input: c, rule }) => {
    const own = spellcasting.find((s) => s.classId === rule.id);
    if (!own) return [];
    const mod = sheet.abilityScores[own.abilityScore.index]?.modifier ?? 0;
    return [{ class: c.class, ability: own.abilityScore.index, saveDC: 8 + sheet.proficiencyBonus + mod, attackBonus: sheet.proficiencyBonus + mod }];
  });

  return { hitDice, spellSlots, pactSlots, spellcasting: spellcastingInfo };
}

// --- Classe d'armure -----------------------------------------------------------------------

export interface ArmorClass {
  value: number;
  detail: string; // "Cotte de mailles 16 + Bouclier 2", "10 + 2 (DEX) + 3 (SAG)"
}

// Armure équipée (+ DEX selon l'armure), sinon 10 + DEX, ou la défense sans
// armure du moine (+ SAG, sans bouclier) et du barbare (+ CON) ; + bouclier.
export async function describeArmorClass(
  db: Db, ctx: RulesContext, input: CharacterInput, sheet: { abilityScores: Record<string, { modifier: number }> }, lang: LangContext,
): Promise<ArmorClass> {
  const mod = (a: string) => sheet.abilityScores[a]?.modifier ?? 0;
  const equipped = input.items.filter((i) => i.equipped && i.equipment).map((i) => i.equipment!);
  const armors = equipped.length
    ? await db.equipment.findMany({
      where: { editionId: ctx.edition?.id, index: { in: equipped }, armor: { isNot: null } },
      select: { translations: t, armor: true },
    })
    : [];
  const name = (a: (typeof armors)[number]) => pick(a.translations, lang).name;
  const body = armors.filter((a) => a.armor!.category !== 'SHIELD').sort((a, b) => b.armor!.baseArmorClass - a.armor!.baseArmorClass)[0];
  const shield = armors.find((a) => a.armor!.category === 'SHIELD');
  const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${-n}`);
  const classes = new Set(input.classes.map((c) => c.class));

  let value: number;
  let detail: string;
  if (body) {
    const dex = body.armor!.addsDexModifier ? Math.min(mod('dex'), body.armor!.maxDexModifier ?? Infinity) : 0;
    value = body.armor!.baseArmorClass + dex;
    detail = `${name(body)} ${body.armor!.baseArmorClass}${body.armor!.addsDexModifier ? ` ${signed(dex)} (DEX)` : ''}`;
  } else {
    const options = [{ value: 10 + mod('dex'), detail: `10 ${signed(mod('dex'))} (DEX)` }];
    if (classes.has('monk') && !shield) options.push({ value: 10 + mod('dex') + mod('wis'), detail: `10 ${signed(mod('dex'))} (DEX) ${signed(mod('wis'))} (SAG)` });
    if (classes.has('barbarian')) options.push({ value: 10 + mod('dex') + mod('con'), detail: `10 ${signed(mod('dex'))} (DEX) ${signed(mod('con'))} (CON)` });
    ({ value, detail } = options.reduce((a, b) => (b.value > a.value ? b : a)));
  }
  if (shield) {
    value += shield.armor!.baseArmorClass;
    detail += ` + ${name(shield)} ${shield.armor!.baseArmorClass}`;
  }
  return { value, detail };
}

// --- Capacités à utilisations limitées ----------------------------------------------------

export interface FeatureResource {
  feature: string | null; // index de capacité de classe (CharacterInput.state.featureUsage)
  trait: string | null; // ou index de trait racial
  name: string;
  max: number;
  used: number;
  recharge: 'SHORT' | 'LONG';
}

// Nombre d'utilisations : colonne de la table de classe, valeur fixe, ou
// formule (modificateur de caractéristique, niveau). Le texte des capacités
// ne le dit pas de façon exploitable : la règle est ici.
type Uses = { column: string } | { fixed: number } | ((ctx: { level: number; mod: (a: string) => number }) => number);
type Recharge = 'SHORT' | 'LONG';
const CLASS_RESOURCES: { class: string; feature: string; uses: Uses; recharge: Recharge | ((level: number) => Recharge) }[] = [
  { class: 'barbarian', feature: 'rage', uses: { column: 'rage_count' }, recharge: 'LONG' },
  { class: 'bard', feature: 'bardic-inspiration-d6', uses: ({ mod }) => Math.max(1, mod('cha')), recharge: (l) => (l >= 5 ? 'SHORT' : 'LONG') },
  { class: 'cleric', feature: 'channel-divinity-1-rest', uses: { column: 'channel_divinity_charges' }, recharge: 'SHORT' },
  { class: 'druid', feature: 'wild-shape-cr-1-4-or-below-no-flying-or-swim-speed', uses: { fixed: 2 }, recharge: 'SHORT' },
  { class: 'fighter', feature: 'second-wind', uses: { fixed: 1 }, recharge: 'SHORT' },
  { class: 'fighter', feature: 'action-surge-1-use', uses: { column: 'action_surges' }, recharge: 'SHORT' },
  { class: 'fighter', feature: 'indomitable-1-use', uses: { column: 'indomitable_uses' }, recharge: 'LONG' },
  { class: 'monk', feature: 'ki', uses: { column: 'ki_points' }, recharge: 'SHORT' },
  { class: 'paladin', feature: 'divine-sense', uses: ({ mod }) => 1 + mod('cha'), recharge: 'LONG' },
  { class: 'paladin', feature: 'lay-on-hands', uses: ({ level }) => 5 * level, recharge: 'LONG' },
  { class: 'paladin', feature: 'channel-divinity', uses: { fixed: 1 }, recharge: 'SHORT' },
  { class: 'sorcerer', feature: 'font-of-magic', uses: { column: 'sorcery_points' }, recharge: 'LONG' },
  { class: 'wizard', feature: 'arcane-recovery', uses: { fixed: 1 }, recharge: 'LONG' },
];
const TRAIT_RESOURCES: { trait: string; uses: number; recharge: Recharge }[] = [{ trait: 'breath-weapon', uses: 1, recharge: 'SHORT' }];

// "Fougue (1 utilisation)" → "Fougue", "Inspiration bardique (d6)" → "Inspiration bardique"
const resourceName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');

export async function describeFeatureResources(
  db: Db, ctx: RulesContext, input: CharacterInput, sheet: { abilityScores: Record<string, { modifier: number }> }, lang: LangContext,
): Promise<FeatureResource[]> {
  const mod = (a: string) => sheet.abilityScores[a]?.modifier ?? 0;
  const usedOf = (feature: string | null, trait: string | null) =>
    input.state.featureUsage.find((u) => (feature ? u.feature === feature : u.trait === trait))?.used ?? 0;
  const result: FeatureResource[] = [];

  const owned = input.classes.flatMap((c) => {
    const rule = ctx.classes.get(c.class);
    return rule ? [{ c, rule }] : [];
  });
  const candidates = CLASS_RESOURCES.filter((r) => owned.some((o) => o.c.class === r.class));
  if (candidates.length) {
    const [features, levels] = await Promise.all([
      db.classFeature.findMany({ where: { editionId: ctx.edition?.id, index: { in: candidates.map((r) => r.feature) } }, select: { index: true, level: true, translations: t } }),
      db.classLevel.findMany({
        where: { OR: owned.map((o) => ({ classId: o.rule.id, level: o.c.levels.length })) },
        select: { classId: true, values: { select: { intValue: true, column: { select: { key: true } } } } },
      }),
    ]);
    for (const r of candidates) {
      const { c, rule } = owned.find((o) => o.c.class === r.class)!;
      const feature = features.find((f) => f.index === r.feature);
      const level = c.levels.length;
      if (!feature || feature.level > level) continue;
      const uses = r.uses;
      const max = typeof uses === 'function'
        ? uses({ level, mod })
        : 'fixed' in uses
          ? uses.fixed
          : levels.find((l) => l.classId === rule.id)?.values.find((v) => v.column.key === uses.column)?.intValue ?? 0;
      if (max <= 0) continue;
      result.push({
        feature: r.feature, trait: null, name: resourceName(pick(feature.translations, lang).name), max, used: usedOf(r.feature, null),
        recharge: typeof r.recharge === 'function' ? r.recharge(level) : r.recharge,
      });
    }
  }

  const traitIds = [...(ctx.race?.traitIds ?? []), ...(ctx.subrace?.traitIds ?? [])];
  if (traitIds.length) {
    const traits = await db.trait.findMany({ where: { id: { in: traitIds }, index: { in: TRAIT_RESOURCES.map((r) => r.trait) } }, select: { index: true, translations: t } });
    for (const trait of traits) {
      const r = TRAIT_RESOURCES.find((x) => x.trait === trait.index)!;
      result.push({ feature: null, trait: trait.index, name: pick(trait.translations, lang).name, max: r.uses, used: usedOf(null, trait.index), recharge: r.recharge });
    }
  }
  return result;
}

// Traits raciaux accordés par un choix (ascendance draconique) : rattachés à
// aucune race, le front ne les trouve pas dans la liste des races
export async function describeGrantedTraits(db: Db, ctx: RulesContext, sheet: { grantedTraits: string[] }, lang: LangContext) {
  if (!sheet.grantedTraits.length) return [];
  const traits = await db.trait.findMany({
    where: { editionId: ctx.edition?.id, index: { in: sheet.grantedTraits } },
    select: { index: true, translations: t },
  });
  return traits.map((trait) => {
    const tt = pick(trait.translations, lang);
    return { index: trait.index, name: tt.name, description: tt.description };
  });
}
