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
