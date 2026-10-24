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

// Objets magiques posés sur un objet de base (arme, armure, munitions, bâton)
const BASE_CATEGORIES = new Set(['weapon', 'armor', 'ammunition', 'staff']);
const magicSelect = {
  index: true, weaponBonus: true, armorBonus: true, requiresAttunement: true, translations: t, equipmentCategory: { select: { index: true } },
} as const;
type MagicRow = { index: string; weaponBonus: number | null; armorBonus: number | null; translations: { localeCode: string; name: string }[] };
// « Épée longue +1 » pour les variantes génériques (« Arme, +1 »), sinon le nom
// de l'objet magique avec celui de l'objet de base (« Épée ardente (épée longue) »)
function magicName(baseName: string, magic: MagicRow | undefined, lang: LangContext): string {
  if (!magic) return baseName;
  const bonus = magic.weaponBonus ?? magic.armorBonus;
  if (/^(weapon|armor|ammunition)-\d$/.test(magic.index) && bonus) return `${baseName} +${bonus}`;
  return `${pick(magic.translations, lang).name} (${baseName.toLowerCase()})`;
}

// Style de combat « Défense » : +1 tant que le personnage porte une armure
const DEFENSE_STYLES = ['fighter-fighting-style-defense', 'fighting-style-defense', 'ranger-fighting-style-defense'];

// Armure équipée (+ DEX selon l'armure, + 1 avec le style Défense), sinon
// 10 + DEX, ou la défense sans armure du moine (+ SAG, sans bouclier), du
// barbare (+ CON) ou la résilience draconique (13 + DEX) ; + bouclier.
export async function describeArmorClass(
  db: Db, ctx: RulesContext, input: CharacterInput,
  sheet: { abilityScores: Record<string, { modifier: number }>; grantedFeatures: string[] }, lang: LangContext,
): Promise<ArmorClass> {
  const mod = (a: string) => sheet.abilityScores[a]?.modifier ?? 0;
  const equippedItems = input.items.filter((i) => i.equipped);
  const armorIndexes = equippedItems.flatMap((i) => (i.equipment ? [i.equipment] : []));
  const magicIndexes = equippedItems.flatMap((i) => (i.magicItem ? [i.magicItem] : []));
  const [armors, magicItems] = await Promise.all([
    armorIndexes.length
      ? db.equipment.findMany({ where: { editionId: ctx.edition?.id, index: { in: armorIndexes }, armor: { isNot: null } }, select: { index: true, translations: t, armor: true } })
      : [],
    magicIndexes.length ? db.magicItem.findMany({ where: { editionId: ctx.edition?.id, index: { in: magicIndexes } }, select: magicSelect }) : [],
  ]);
  const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${-n}`);
  // Armures et boucliers portés, avec le bonus de l'objet magique posé dessus
  const worn = equippedItems.flatMap((item) => {
    const armor = armors.find((a) => a.index === item.equipment);
    if (!armor) return [];
    const magic = magicItems.find((m) => m.index === item.magicItem);
    const bonus = magic?.armorBonus ?? 0;
    return [{ stats: armor.armor!, bonus, name: magicName(pick(armor.translations, lang).name, magic, lang) }];
  });
  const body = worn.filter((a) => a.stats.category !== 'SHIELD').sort((a, b) => b.stats.baseArmorClass + b.bonus - (a.stats.baseArmorClass + a.bonus))[0];
  const shield = worn.filter((a) => a.stats.category === 'SHIELD').sort((a, b) => b.bonus - a.bonus)[0];

  const classes = new Set(input.classes.map((c) => c.class));
  const defenseStyle = DEFENSE_STYLES.find((f) => sheet.grantedFeatures.includes(f));
  const draconic = input.classes.some((c) => c.class === 'sorcerer' && c.subclass === 'draconic');
  const wanted = [defenseStyle, draconic && 'draconic-resilience'].filter((f): f is string => !!f);
  const features = wanted.length
    ? await db.classFeature.findMany({ where: { editionId: ctx.edition?.id, index: { in: wanted } }, select: { index: true, translations: t } })
    : [];
  const featureName = (index: string) => {
    const f = features.find((x) => x.index === index);
    return f ? pick(f.translations, lang).name : index;
  };

  let value: number;
  let detail: string;
  if (body) {
    const dex = body.stats.addsDexModifier ? Math.min(mod('dex'), body.stats.maxDexModifier ?? Infinity) : 0;
    value = body.stats.baseArmorClass + body.bonus + dex;
    detail = `${body.name} ${body.stats.baseArmorClass + body.bonus}${body.stats.addsDexModifier ? ` ${signed(dex)} (DEX)` : ''}`;
    if (defenseStyle) {
      value += 1;
      detail += ` + 1 (${featureName(defenseStyle)})`;
    }
  } else {
    const options = [{ value: 10 + mod('dex'), detail: `10 ${signed(mod('dex'))} (DEX)` }];
    if (classes.has('monk') && !shield) options.push({ value: 10 + mod('dex') + mod('wis'), detail: `10 ${signed(mod('dex'))} (DEX) ${signed(mod('wis'))} (SAG)` });
    if (classes.has('barbarian')) options.push({ value: 10 + mod('dex') + mod('con'), detail: `10 ${signed(mod('dex'))} (DEX) ${signed(mod('con'))} (CON)` });
    if (draconic) options.push({ value: 13 + mod('dex'), detail: `13 ${signed(mod('dex'))} (DEX, ${featureName('draconic-resilience')})` });
    ({ value, detail } = options.reduce((a, b) => (b.value > a.value ? b : a)));
  }
  if (shield) {
    value += shield.stats.baseArmorClass + shield.bonus;
    detail += ` + ${shield.name} ${shield.stats.baseArmorClass + shield.bonus}`;
  }
  // Objets portés qui protègent (anneau, cape de protection…), harmonisés s'ils
  // demandent un lien ; bracelets de défense : sans armure ni bouclier
  for (const item of equippedItems) {
    const magic = !item.equipment ? magicItems.find((m) => m.index === item.magicItem) : undefined;
    if (!magic?.armorBonus || BASE_CATEGORIES.has(magic.equipmentCategory.index)) continue;
    if (magic.requiresAttunement && !item.attuned) continue;
    if (magic.index === 'bracers-of-defense' && (body || shield)) continue;
    value += magic.armorBonus;
    detail += ` + ${magic.armorBonus} (${pick(magic.translations, lang).name})`;
  }
  return { value, detail };
}

// --- Attaques ----------------------------------------------------------------------------

export interface Attack {
  kind: 'WEAPON' | 'SPELL';
  index: string;
  name: string;
  // Jet d'attaque (+5), ou null pour un sort à sauvegarde
  attackBonus: number | null;
  // Sort à sauvegarde : « DD 13 DEX »
  save: { dc: number; ability: string } | null;
  damage: string | null; // « 1d8 + 3 tranchant »
  versatileDamage: string | null; // à deux mains
  range: string | null; // « 24 / 96 m »
  properties: string[];
  equipped: boolean;
}

const ARCHERY = ['fighter-fighting-style-archery', 'ranger-fighting-style-archery'];
const DUELING = ['fighter-fighting-style-dueling', 'fighting-style-dueling', 'ranger-fighting-style-dueling'];

const meters = (ft: number) => String(Math.round(ft * 0.3 * 10) / 10).replace('.', ',');
const withMod = (dice: string, mod: number) => (mod ? `${dice} ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : dice);

// Armes de l'inventaire et sorts mineurs offensifs, comme sur la fiche papier :
// jet d'attaque (caractéristique + maîtrise + style de combat) et dégâts
// Dé d'arts martiaux du moine selon son niveau de moine (SRD 5.1)
const martialArtsDie = (monkLevel: number) => (monkLevel >= 17 ? 10 : monkLevel >= 11 ? 8 : monkLevel >= 5 ? 6 : 4);
const average = (dice: string) => {
  const m = /^(\d+)d(\d+)$/.exec(dice);
  return m ? (Number(m[1]) * (Number(m[2]) + 1)) / 2 : Number(dice) || 0;
};
// Décharge occulte : un rayon de plus aux niveaux 5, 11 et 17 du personnage
const eldritchBeams = (level: number) => 1 + [5, 11, 17].filter((l) => level >= l).length;
const AGONIZING_BLAST = 'eldritch-invocation-agonizing-blast';

export async function describeAttacks(
  db: Db, ctx: RulesContext, input: CharacterInput,
  sheet: { level: number; proficiencyBonus: number; abilityScores: Record<string, { modifier: number }>; grantedFeatures: string[] },
  known: { proficiencies: { index: string }[] }, spellcasting: Resources['spellcasting'], lang: LangContext,
  granted: GrantedSpell[] = [],
): Promise<Attack[]> {
  const mod = (a: string) => sheet.abilityScores[a]?.modifier ?? 0;
  const has = (list: string[]) => list.some((f) => sheet.grantedFeatures.includes(f));
  const archery = has(ARCHERY);
  const dueling = has(DUELING);
  const monkLevel = input.classes.find((c) => c.class === 'monk')?.levels.length ?? 0;

  // Une attaque par objet de l'inventaire (une épée longue +1 et une épée longue ordinaire en font deux)
  const weaponItems = input.items.filter((i) => i.equipment);
  const cantrips = input.spells.filter((s) => ctx.spells.get(s.spell)?.level === 0);
  // Sorts mineurs accordés (trait racial, choix), avec leurs propres valeurs d'incantation
  const grantedCantrips = granted.filter((g) => g.level === 0 && g.saveDC != null && !cantrips.some((c) => c.spell === g.index));
  const cantripIndexes = [...cantrips.map((s) => s.spell), ...grantedCantrips.map((g) => g.index)];
  const magicIndexes = [...new Set(weaponItems.flatMap((i) => (i.magicItem ? [i.magicItem] : [])))];
  const [weapons, magicItems, proficiencies, spells] = await Promise.all([
    weaponItems.length
      ? db.equipment.findMany({
        where: { editionId: ctx.edition?.id, index: { in: [...new Set(weaponItems.map((i) => i.equipment!))] }, weapon: { isNot: null } },
        select: {
          id: true, index: true, translations: t, categories: { select: { categoryId: true } },
          weapon: { include: { damageType: named, properties: { include: { property: named } } } },
        },
      })
      : [],
    magicIndexes.length ? db.magicItem.findMany({ where: { editionId: ctx.edition?.id, index: { in: magicIndexes } }, select: magicSelect }) : [],
    db.proficiency.findMany({
      where: { editionId: ctx.edition?.id, type: 'WEAPON', index: { in: known.proficiencies.map((p) => p.index) } },
      select: { equipmentId: true, equipmentCategoryId: true },
    }),
    cantripIndexes.length
      ? db.spell.findMany({
        where: { editionId: ctx.edition?.id, index: { in: cantripIndexes }, damageScaling: { not: Prisma.DbNull } },
        select: { index: true, attackType: true, rangeFt: true, damageScaling: true, translations: t, damageTypes: { select: { damageType: named } }, saveAbility: { select: { index: true } } },
      })
      : [],
  ]);
  const name = (x: { translations: { localeCode: string; name: string }[] }) => pick(x.translations, lang).name;
  const proficientIn = (w: (typeof weapons)[number]) =>
    proficiencies.some((p) => p.equipmentId === w.id || (p.equipmentCategoryId != null && w.categories.some((c) => c.categoryId === p.equipmentCategoryId)));

  const entries = new Map<string, { weapon: (typeof weapons)[number]; magic: (typeof magicItems)[number] | undefined; equipped: boolean }>();
  for (const item of weaponItems) {
    const weapon = weapons.find((w) => w.index === item.equipment);
    if (!weapon) continue;
    // Arme ordinaire : son index ; arme magique : « longsword|weapon-1 »
    const key = item.magicItem ? `${item.equipment}|${item.magicItem}` : item.equipment!;
    const magic = magicItems.find((m) => m.index === item.magicItem);
    entries.set(key, { weapon, magic, equipped: (entries.get(key)?.equipped ?? false) || !!item.equipped });
  }
  const meleeEquipped = [...entries.values()].filter((e) => e.equipped && e.weapon.weapon!.range === 'MELEE');
  const attacks: Attack[] = [];

  for (const [key, { weapon: w, magic, equipped }] of entries) {
    const stats = w.weapon!;
    const props = new Set(stats.properties.map((p) => p.property.index));
    const ranged = stats.range === 'RANGED';
    const monkWeapon = monkLevel > 0 && props.has('monk');
    const ability = props.has('finesse') || monkWeapon
      ? (mod('dex') >= mod('str') ? 'dex' : 'str')
      : ranged ? 'dex' : 'str';
    const magicBonus = magic?.weaponBonus ?? 0;
    const attackBonus = mod(ability) + (proficientIn(w) ? sheet.proficiencyBonus : 0) + (archery && ranged ? 2 : 0) + magicBonus;
    // Duel : une seule arme de corps à corps tenue (à une main), pas d'autre arme
    const duel = dueling && !ranged && !props.has('two-handed') && meleeEquipped.length === 1 && meleeEquipped[0]!.weapon.index === w.index;
    const damageMod = mod(ability) + (duel ? 2 : 0) + magicBonus;
    // Arme de moine : le dé d'arts martiaux s'il est meilleur que celui de l'arme
    const martial = monkWeapon ? `1d${martialArtsDie(monkLevel)}` : null;
    const dice = stats.damageDice && martial && average(martial) > average(stats.damageDice) ? martial : stats.damageDice;
    const type = stats.damageType ? ` ${name(stats.damageType).toLowerCase()}` : '';
    attacks.push({
      kind: 'WEAPON',
      index: key,
      name: magicName(name(w), magic, lang),
      attackBonus,
      save: null,
      damage: dice ? `${withMod(dice, damageMod)}${type}` : null,
      versatileDamage: stats.versatileDice ? `${withMod(stats.versatileDice, mod(ability) + magicBonus)}${type}` : null,
      range: stats.normalRangeFt ? `${meters(stats.normalRangeFt)}${stats.longRangeFt ? ` / ${meters(stats.longRangeFt)}` : ''} m` : null,
      properties: [
        ...(magic ? ['Magique'] : []),
        ...(dice === martial && martial ? ['Arts martiaux'] : []),
        ...stats.properties.filter((p) => p.property.index !== 'monk').map((p) => name(p.property)),
      ],
      equipped,
    });
  }
  // Moine : attaque à mains nues avec le dé d'arts martiaux
  if (monkLevel > 0) {
    const ability = mod('dex') >= mod('str') ? 'dex' : 'str';
    attacks.push({
      kind: 'WEAPON', index: 'unarmed-strike', name: 'Attaque à mains nues', attackBonus: mod(ability) + sheet.proficiencyBonus, save: null,
      damage: `${withMod(`1d${martialArtsDie(monkLevel)}`, mod(ability))} contondant`, versatileDamage: null, range: null,
      properties: ['Arts martiaux'], equipped: true,
    });
  }
  // Armes équipées d'abord
  attacks.sort((a, b) => Number(b.equipped) - Number(a.equipped));

  for (const s of spells) {
    const scaling = s.damageScaling as { by?: string; values?: Record<string, string> } | null;
    if (scaling?.by !== 'character_level' || !scaling.values) continue;
    const reached = Object.keys(scaling.values).map(Number).filter((l) => l <= sheet.level).sort((a, b) => b - a)[0];
    let dice = reached != null ? scaling.values[String(reached)] : undefined;
    if (!dice) continue;
    const own = grantedCantrips.find((g) => g.index === s.index);
    const caster = own
      ? { saveDC: own.saveDC!, attackBonus: own.attackBonus! }
      : spellcasting.find((c) => c.class === cantrips.find((x) => x.spell === s.index)?.class) ?? spellcasting[0];
    if (!caster) continue;
    const type = s.damageTypes.map((d) => name(d.damageType).toLowerCase()).join(' ou ');
    const properties: string[] = [];
    // Décharge occulte : plusieurs rayons, + CHA à chacun avec Explosion agonisante
    if (s.index === 'eldritch-blast') {
      if (has([AGONIZING_BLAST])) dice = withMod(dice, mod('cha'));
      const beams = eldritchBeams(sheet.level);
      if (beams > 1) properties.push(`${beams} rayons (un jet d'attaque chacun)`);
    }
    attacks.push({
      kind: 'SPELL',
      index: s.index,
      name: name(s),
      attackBonus: s.attackType ? caster.attackBonus : null,
      save: !s.attackType && s.saveAbility ? { dc: caster.saveDC, ability: s.saveAbility.index } : null,
      damage: `${dice}${type ? ` ${type}` : ''}`,
      versatileDamage: null,
      range: s.rangeFt ? `${meters(s.rangeFt)} m` : null,
      properties,
      equipped: false,
    });
  }
  return attacks;
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

// --- Sorts accordés et résistances ----------------------------------------------------------

// Traits du personnage : race, sous-race, et ceux accordés par un choix
const characterTraitIds = (ctx: RulesContext, sheet: { grantedTraits: string[] }) => [
  ...(ctx.race?.traitIds ?? []), ...(ctx.subrace?.traitIds ?? []),
  ...sheet.grantedTraits.flatMap((index) => { const id = ctx.traits.get(index); return id ? [id] : []; }),
];

export interface GrantedSpell {
  index: string;
  name: string;
  level: number;
  source: string; // « Héritage infernal », « Domaine de la Vie »
  // Trait racial, sous-classe (toujours préparé, sans compter dans la limite),
  // capacité de classe (manifestation occulte) ou choix
  kind: 'TRAIT' | 'SUBCLASS' | 'FEATURE' | 'CHOICE';
  // Valeurs d'incantation : celles du trait, ou de la classe pour une sous-classe
  ability: string | null;
  saveDC: number | null;
  attackBonus: number | null;
  castAtLevel: number | null; // lancé comme un sort de ce niveau
  oncePerLongRest: boolean; // une fois par repos long
  atWill: boolean; // à volonté, sans emplacement de sort
}

// Occultiste : les sorts du patron étendent seulement la liste de sorts
const EXPANDED_LIST_CLASSES = new Set(['warlock']);

const spellSelect = { select: { index: true, level: true, translations: t } } as const;
const sourceSelect = { select: { index: true, translations: t, spellAbility: { select: { index: true } } } } as const;

// Sorts que le personnage a sans les choisir dans sa liste de classe : traits
// raciaux (héritage infernal), sorts de sous-classe toujours préparés (domaine,
// serment, cercle), capacités choisies (manifestations occultes, pacte de la
// chaîne) et sorts pris dans un choix (sort mineur du haut-elfe).
export async function describeGrantedSpells(
  db: Db, ctx: RulesContext, input: CharacterInput,
  sheet: { level: number; proficiencyBonus: number; abilityScores: Record<string, { modifier: number }>; grantedTraits: string[]; grantedFeatures: string[] },
  spellcasting: Resources['spellcasting'], lang: LangContext,
): Promise<GrantedSpell[]> {
  const casting = (ability: string | null) => {
    if (!ability) return { ability: null, saveDC: null, attackBonus: null };
    const mod = sheet.abilityScores[ability]?.modifier ?? 0;
    return { ability, saveDC: 8 + sheet.proficiencyBonus + mod, attackBonus: sheet.proficiencyBonus + mod };
  };
  const ofClass = (classIndex: string | undefined) => {
    const c = spellcasting.find((s) => s.class === classIndex);
    return c ? { ability: c.ability, saveDC: c.saveDC, attackBonus: c.attackBonus } : casting(null);
  };
  const traitIds = characterTraitIds(ctx, sheet);
  const optionIds = input.choices.flatMap((c) => (c.optionId != null ? [c.optionId] : []));
  const subclasses = input.classes.filter((c) => c.subclass);

  const [traitSpells, chosen, subclassSpells, featureSpells] = await Promise.all([
    traitIds.length
      ? db.traitSpell.findMany({ where: { traitId: { in: traitIds }, requiredCharacterLevel: { lte: sheet.level } }, include: { spell: spellSelect, trait: sourceSelect }, orderBy: { requiredCharacterLevel: 'asc' } })
      : [],
    optionIds.length
      ? db.choiceOptionItem.findMany({
        where: { optionId: { in: optionIds }, spellId: { not: null } },
        select: { spell: spellSelect, option: { select: { choice: { select: { trait: sourceSelect, class: { select: { index: true } }, subclass: { select: { class: { select: { index: true } } } } } } } } },
      })
      : [],
    subclasses.length
      ? db.subclassSpell.findMany({
        where: { subclass: { editionId: ctx.edition?.id, index: { in: subclasses.map((c) => c.subclass!) } } },
        include: { spell: spellSelect, subclass: { select: { index: true, translations: t, class: { select: { index: true } } } }, requiredFeature: { select: { index: true } } },
      })
      : [],
    // Capacités accordées par une option (les manifestations se choisissent)
    sheet.grantedFeatures.length
      ? db.classFeatureSpell.findMany({
        where: { classFeature: { editionId: ctx.edition?.id, index: { in: sheet.grantedFeatures } } },
        include: { spell: spellSelect, classFeature: { select: { translations: t, class: { select: { index: true } } } } },
      })
      : [],
  ]);
  const name = (x: { translations: { localeCode: string; name: string }[] }) => pick(x.translations, lang).name;
  const result: GrantedSpell[] = [];
  const add = (spell: { index: string; level: number; translations: { localeCode: string; name: string }[] }, kind: GrantedSpell['kind'], source: string, values: ReturnType<typeof casting>, extra: { castAtLevel?: number | null; oncePerLongRest?: boolean; atWill?: boolean } = {}) => {
    if (result.some((r) => r.index === spell.index && r.source === source)) return;
    result.push({ index: spell.index, name: name(spell), level: spell.level, source, kind, ...values, castAtLevel: extra.castAtLevel ?? null, oncePerLongRest: extra.oncePerLongRest ?? false, atWill: extra.atWill ?? false });
  };

  for (const s of traitSpells) add(s.spell, 'TRAIT', name(s.trait), casting(s.trait.spellAbility?.index ?? null), s);
  for (const item of chosen) {
    const choice = item.option.choice;
    if (!item.spell) continue;
    if (choice.trait) add(item.spell, 'CHOICE', name(choice.trait), casting(choice.trait.spellAbility?.index ?? null));
    else add(item.spell, 'CHOICE', 'Choix', ofClass(choice.class?.index ?? choice.subclass?.class.index));
  }
  for (const s of subclassSpells) {
    const owner = subclasses.find((c) => c.subclass === s.subclass.index && c.class === s.subclass.class.index);
    if (!owner || EXPANDED_LIST_CLASSES.has(owner.class) || s.requiredClassLevel > owner.levels.length) continue;
    // Cercle de la Terre : seulement les sorts du terrain choisi
    if (s.requiredFeature && !sheet.grantedFeatures.includes(s.requiredFeature.index)) continue;
    add(s.spell, 'SUBCLASS', name(s.subclass), ofClass(owner.class));
  }
  for (const s of featureSpells) add(s.spell, 'FEATURE', name(s.classFeature), ofClass(s.classFeature.class.index), s);
  return result.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export interface DamageResistance {
  damageType: string;
  name: string; // « Feu »
  source: string; // « Résistance infernale »
}

// Résistances aux dégâts des traits (résistance infernale, ascendance draconique…)
export async function describeResistances(db: Db, ctx: RulesContext, sheet: { grantedTraits: string[] }, lang: LangContext): Promise<DamageResistance[]> {
  const traitIds = characterTraitIds(ctx, sheet);
  if (!traitIds.length) return [];
  const rows = await db.traitDamageResistance.findMany({
    where: { traitId: { in: traitIds } },
    select: { damageType: named, trait: { select: { translations: t } } },
  });
  return rows.map((r) => ({ damageType: r.damageType.index, name: pick(r.damageType.translations, lang).name, source: pick(r.trait.translations, lang).name }));
}

// --- Pendant le tour : actions, actions bonus, réactions -----------------------------------

export interface TurnOption {
  activation: 'ACTION' | 'BONUS_ACTION' | 'REACTION';
  source: 'FEATURE' | 'TRAIT' | 'SPELL';
  index: string;
  name: string;
  spellLevel: number | null;
}

// Une capacité qui s'améliore avec le niveau a une entrée par palier (Inspiration
// bardique (d6), (d8)…) : seule la plus haute atteinte compte
const baseName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');

// Ce que le personnage peut faire pendant son tour en plus des actions de base :
// capacités de classe, traits raciaux et sorts lançables en une action, une
// action bonus ou une réaction. Sorts : préparés (ou connus), et sorts accordés.
export async function describeTurn(
  db: Db, ctx: RulesContext, input: CharacterInput, sheet: { grantedTraits: string[]; grantedFeatures: string[] },
  granted: GrantedSpell[], lang: LangContext,
): Promise<TurnOption[]> {
  const owned = input.classes.flatMap((c) => {
    const rule = ctx.classes.get(c.class);
    if (!rule) return [];
    const subclassId = c.subclass ? rule.subclasses.get(c.subclass) ?? -1 : -1;
    return [{ classId: rule.id, level: { lte: c.levels.length }, OR: [{ subclassId: null }, { subclassId }] }];
  });
  // Sorts de classe castables : sorts mineurs, sorts préparés, ou tous ceux d'un lanceur à sorts connus
  const knownCaster = (classIndex: string) => {
    const c = input.classes.find((x) => x.class === classIndex);
    return ctx.classes.get(classIndex)?.levels.get(c?.levels.length ?? 0)?.spellsKnown != null;
  };
  const castable = input.spells.filter((s) => ctx.spells.get(s.spell)?.level === 0 || s.prepared || knownCaster(s.class));
  const spellIndexes = [...new Set([...castable.map((s) => s.spell), ...granted.map((g) => g.index)])];
  const traitIds = characterTraitIds(ctx, sheet);

  const [features, traits, spells] = await Promise.all([
    db.classFeature.findMany({
      where: {
        editionId: ctx.edition?.id, activation: { not: null },
        OR: [
          // Capacités de niveau, hors options d'un choix (manifestations, styles de combat)
          ...owned.map((o) => ({ ...o, parentId: null, choiceItems: { none: {} } })),
          { index: { in: sheet.grantedFeatures } },
        ],
      },
      select: { index: true, level: true, activation: true, translations: t },
      orderBy: { level: 'desc' },
    }),
    traitIds.length ? db.trait.findMany({ where: { id: { in: traitIds }, activation: { not: null } }, select: { index: true, activation: true, translations: t } }) : [],
    spellIndexes.length
      ? db.spell.findMany({
        where: { editionId: ctx.edition?.id, index: { in: spellIndexes }, castingTimeUnit: { in: ['ACTION', 'BONUS_ACTION', 'REACTION'] } },
        select: { index: true, level: true, castingTimeUnit: true, translations: t },
      })
      : [],
  ]);

  const result: TurnOption[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const name = pick(f.translations, lang).name;
    if (seen.has(baseName(name))) continue;
    seen.add(baseName(name));
    result.push({ activation: f.activation!, source: 'FEATURE', index: f.index, name: baseName(name), spellLevel: null });
  }
  for (const tr of traits) result.push({ activation: tr.activation!, source: 'TRAIT', index: tr.index, name: pick(tr.translations, lang).name, spellLevel: null });
  for (const s of spells.sort((a, b) => a.level - b.level)) {
    result.push({ activation: s.castingTimeUnit as TurnOption['activation'], source: 'SPELL', index: s.index, name: pick(s.translations, lang).name, spellLevel: s.level });
  }
  return result;
}
