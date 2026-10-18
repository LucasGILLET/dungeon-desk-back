// Règles de construction d'un personnage, sans accès à la base : le contexte
// (données de jeu utiles) est chargé par context.ts. Deux niveaux de problème :
//
//   erreurs    personnage impossible (option d'un autre choix, sort hors de la
//              liste de la classe, niveaux qui se chevauchent…) → refusé
//   en attente personnage incomplet mais valide (sous-classe pas encore choisie,
//              compétences à choisir à ce niveau…) → accepté, signalé dans la
//              fiche pour guider la montée de niveau
import type { AbilityGenerationMethod, ChoiceKind, ChoicePool, Currency, PersonalityKind } from '@prisma/client';
import type { CharacterInput } from './input';

// --- Contexte : données de jeu nécessaires à la validation -------------------

export interface ChoiceOwner {
  classId: number | null;
  subclassId: number | null;
  classFeatureId: number | null;
  raceId: number | null;
  subraceId: number | null;
  traitId: number | null;
  backgroundId: number | null;
  parentOptionId: number | null;
}

export interface ChoiceRule {
  id: number;
  kind: ChoiceKind;
  choose: number;
  owner: ChoiceOwner;
  pool: ChoicePool | null;
  poolCategoryId: number | null;
  options: {
    id: number;
    items: { abilityScoreId: number | null; bonus: number | null; classFeatureId: number | null; traitId: number | null }[];
  }[];
}

export interface ClassLevelRule {
  abilityScoreImprovements: number; // cumulé
  cantripsKnown: number | null;
  spellsKnown: number | null;
  maxSpellLevel: number; // 0 = pas d'emplacement
}

export interface ClassRule {
  id: number;
  index: string;
  hitDie: number;
  subclassLevel: number;
  levels: Map<number, ClassLevelRule>;
  subclasses: Map<string, number>;
  multiclassRequirements: { abilityScoreId: number; minimumScore: number; alternativeGroup: number }[];
  spellIds: Set<number>;
  features: Map<number, { index: string; level: number; subclassId: number | null }>;
}

export interface RulesContext {
  // Règles de création des caractéristiques de l'édition
  edition: { id: number; code: string; pointBuyBudget: number; pointBuyCosts: Record<string, number>; standardArray: number[] } | null;
  abilities: Map<string, number>; // index → id
  constitutionId: number | undefined;
  race: { id: number; bonuses: Map<number, number>; traitIds: number[] } | null;
  subrace: { id: number; raceId: number; bonuses: Map<number, number>; traitIds: number[] } | null;
  background: { id: number; personality: Map<number, PersonalityKind> } | null;
  alignmentId: number | null;
  classes: Map<string, ClassRule>;
  subclassSpells: Map<number, Set<number>>;
  feats: Map<string, { id: number; prerequisites: { abilityScoreId: number; minimumScore: number; alternativeGroup: number }[] }>;
  spells: Map<string, { id: number; level: number }>;
  equipment: Map<string, number>;
  languages: Map<string, number>;
  conditions: Map<string, number>;
  traits: Map<string, number>;
  choices: Map<number, ChoiceRule>;
  categoryMembers: Map<number, Set<number>>; // catégorie → objets
}

// --- Résultat : ce qui sera écrit en base -------------------------------------

export interface CharacterPlan {
  core: {
    editionId: number;
    name: string;
    raceId: number;
    subraceId: number | null;
    backgroundId: number | null;
    alignmentId: number | null;
    abilityMethod: AbilityGenerationMethod;
    experiencePoints: number;
    currentHitPoints: number | null;
    temporaryHitPoints: number;
    deathSaveSuccesses: number;
    deathSaveFailures: number;
    inspiration: boolean;
    appearance: string | null;
    backstory: string | null;
    notes: string | null;
    portraitUrl: string | null;
  };
  abilityScores: { abilityScoreId: number; score: number }[];
  classes: {
    classId: number;
    subclassId: number | null;
    position: number;
    hitDiceUsed: number;
    levels: { classLevel: number; characterLevel: number; hitPointRoll: number | null; featId: number | null; abilityIncreases: { abilityScoreId: number; bonus: number }[] }[];
  }[];
  // level : montée de niveau à laquelle le choix a été fait (classe, niveau de classe)
  choices: { choiceId: number; optionId: number | null; languageId: number | null; equipmentId: number | null; level: { classId: number; classLevel: number } | null }[];
  spells: { classId: number; spellId: number; prepared: boolean }[];
  items: { equipmentId: number | null; name: string | null; description: string | null; quantity: number; equipped: boolean; attuned: boolean; position: number }[];
  currencies: { currency: Currency; amount: number }[];
  personality: { kind: PersonalityKind; optionId: number | null; customText: string | null }[];
  conditionIds: number[];
  spellSlotUsage: { spellLevel: number; pact: boolean; used: number }[];
  featureUsage: { classFeatureId: number | null; traitId: number | null; used: number }[];
}

export interface Issue {
  path: string;
  message: string;
}

export interface CharacterSheet {
  level: number;
  proficiencyBonus: number;
  maxHitPoints: number;
  abilityScores: Record<string, { base: number; bonus: number; total: number; modifier: number }>;
  pending: {
    subclasses: string[]; // classes dont la sous-classe reste à choisir
    abilityScoreImprovements: { class: string; level: number }[];
    choices: { choiceId: number; kind: ChoiceKind; remaining: number }[];
  };
}

export interface Analysis {
  plan: CharacterPlan | null; // null si erreurs
  errors: Issue[];
  sheet: CharacterSheet | null;
  // Choix accessibles au personnage (répondus ou non), dans l'ordre du contexte
  availableChoices: number[];
}

const MAX_ATTUNED = 3;

export const modifier = (score: number) => Math.floor((score - 10) / 2);
export const proficiencyBonus = (level: number) => 2 + Math.floor((Math.max(level, 1) - 1) / 4);

export function analyse(input: CharacterInput, ctx: RulesContext): Analysis {
  const errors: Issue[] = [];
  const fail = (path: string, message: string) => errors.push({ path, message });
  const lookup = <T>(map: Map<string, T>, value: string, path: string, what: string): T | undefined => {
    const found = map.get(value);
    if (found === undefined) fail(path, `Unknown ${what} "${value}" in edition ${input.edition}`);
    return found;
  };

  if (!ctx.edition) {
    return { plan: null, errors: [{ path: 'edition', message: `Unknown edition "${input.edition}"` }], sheet: null, availableChoices: [] };
  }

  // --- Race, historique, alignement ---
  if (!ctx.race) fail('race', `Unknown race "${input.race}" in edition ${input.edition}`);
  if (input.subrace && !ctx.subrace) fail('subrace', `Unknown subrace "${input.subrace}"`);
  if (ctx.subrace && ctx.race && ctx.subrace.raceId !== ctx.race.id) fail('subrace', `Subrace "${input.subrace}" does not belong to race "${input.race}"`);
  if (input.background && !ctx.background) fail('background', `Unknown background "${input.background}"`);
  if (input.alignment && !ctx.alignmentId) fail('alignment', `Unknown alignment "${input.alignment}"`);

  // --- Caractéristiques de base ---
  const abilityScores: CharacterPlan['abilityScores'] = [];
  for (const [ability, score] of Object.entries(input.abilityScores)) {
    const abilityScoreId = lookup(ctx.abilities, ability, `abilityScores.${ability}`, 'ability score');
    if (abilityScoreId) abilityScores.push({ abilityScoreId, score });
  }
  if (abilityScores.length !== ctx.abilities.size) fail('abilityScores', `Expected the ${ctx.abilities.size} ability scores (${[...ctx.abilities.keys()].join(', ')})`);
  const bases = Object.values(input.abilityScores);
  const { standardArray, pointBuyCosts, pointBuyBudget } = ctx.edition;
  const sortedArray = [...standardArray].sort((a, b) => b - a);
  if (input.abilityMethod === 'STANDARD_ARRAY' && [...bases].sort((a, b) => b - a).join() !== sortedArray.join()) {
    fail('abilityScores', `Standard array must be ${sortedArray.join(', ')}`);
  }
  if (input.abilityMethod === 'POINT_BUY') {
    const values = Object.keys(pointBuyCosts).map(Number);
    if (bases.some((s) => pointBuyCosts[String(s)] === undefined)) fail('abilityScores', `Point buy scores must be between ${Math.min(...values)} and ${Math.max(...values)}`);
    else if (bases.reduce((sum, s) => sum + pointBuyCosts[String(s)]!, 0) > pointBuyBudget) fail('abilityScores', `Point buy cannot exceed ${pointBuyBudget} points`);
  }

  // --- Classes et niveaux ---
  const classes: CharacterPlan['classes'] = [];
  const classLevel = new Map<number, number>(); // classId → niveau atteint
  const chosenSubclasses = new Set<number>();
  const pendingSubclasses: string[] = [];
  const pendingAsi: CharacterSheet['pending']['abilityScoreImprovements'] = [];
  const characterLevels: number[] = [];
  const seenClasses = new Set<string>();
  for (const [ci, entry] of input.classes.entries()) {
    const path = `classes[${ci}]`;
    if (seenClasses.has(entry.class)) fail(`${path}.class`, `Class "${entry.class}" is listed twice`);
    seenClasses.add(entry.class);
    const rule = lookup(ctx.classes, entry.class, `${path}.class`, 'class');
    if (!rule) continue;

    const sorted = [...entry.levels].sort((a, b) => a.level - b.level);
    sorted.forEach((l, i) => { if (l.level !== i + 1) fail(`${path}.levels`, `Levels of ${entry.class} must go from 1 to ${sorted.length} without gaps`); });
    const reached = sorted.length;
    classLevel.set(rule.id, reached);

    let subclassId: number | null = null;
    if (entry.subclass) {
      subclassId = rule.subclasses.get(entry.subclass) ?? null;
      if (!subclassId) fail(`${path}.subclass`, `Subclass "${entry.subclass}" does not belong to class "${entry.class}"`);
      else if (reached < rule.subclassLevel) fail(`${path}.subclass`, `${entry.class} chooses a subclass at level ${rule.subclassLevel}`);
      else chosenSubclasses.add(subclassId);
    } else if (reached >= rule.subclassLevel) {
      pendingSubclasses.push(entry.class);
    }

    const levels: CharacterPlan['classes'][number]['levels'] = [];
    for (const [li, l] of entry.levels.entries()) {
      const lpath = `${path}.levels[${li}]`;
      characterLevels.push(l.characterLevel);
      if (l.hitPointRoll != null && l.hitPointRoll > rule.hitDie) fail(`${lpath}.hitPointRoll`, `Hit point roll cannot exceed d${rule.hitDie}`);
      if (l.characterLevel === 1 && l.hitPointRoll != null) fail(`${lpath}.hitPointRoll`, 'First level hit points are the maximum of the hit die');

      const here = rule.levels.get(l.level);
      const before = rule.levels.get(l.level - 1);
      const grantsAsi = !!here && here.abilityScoreImprovements > (before?.abilityScoreImprovements ?? 0);
      let featId: number | null = null;
      const abilityIncreases: { abilityScoreId: number; bonus: number }[] = [];
      if (l.feat) {
        const feat = lookup(ctx.feats, l.feat, `${lpath}.feat`, 'feat');
        if (feat) featId = feat.id;
      }
      for (const inc of l.abilityIncreases) {
        const abilityScoreId = lookup(ctx.abilities, inc.ability, `${lpath}.abilityIncreases`, 'ability score');
        if (abilityScoreId) abilityIncreases.push({ abilityScoreId, bonus: inc.bonus });
      }
      const usesAsi = !!l.feat || l.abilityIncreases.length > 0;
      if (usesAsi && !grantsAsi) fail(lpath, `${entry.class} level ${l.level} does not grant an ability score improvement`);
      if (grantsAsi) {
        if (l.feat && l.abilityIncreases.length) fail(lpath, 'Choose either a feat or ability score increases, not both');
        const total = l.abilityIncreases.reduce((sum, inc) => sum + inc.bonus, 0);
        const distinct = new Set(l.abilityIncreases.map((inc) => inc.ability)).size === l.abilityIncreases.length;
        if (l.abilityIncreases.length && (total !== 2 || !distinct)) fail(`${lpath}.abilityIncreases`, 'Ability score improvement is +2 to one score or +1 to two scores');
        if (!usesAsi) pendingAsi.push({ class: entry.class, level: l.level });
      }
      levels.push({ classLevel: l.level, characterLevel: l.characterLevel, hitPointRoll: l.hitPointRoll ?? null, featId, abilityIncreases });
    }
    classes.push({ classId: rule.id, subclassId, position: ci, hitDiceUsed: entry.hitDiceUsed, levels });
  }

  const totalLevel = characterLevels.length;
  if (totalLevel > 20) fail('classes', 'A character cannot exceed level 20');
  const order = [...characterLevels].sort((a, b) => a - b);
  if (order.some((n, i) => n !== i + 1)) fail('classes', `characterLevel values must go from 1 to ${totalLevel}, once each`);
  const first = input.classes[0]?.levels.find((l) => l.characterLevel === 1);
  if (input.classes[0] && first?.level !== 1) fail('classes[0]', 'The first class must take character level 1');

  // --- Choix : options, réserves, accès ---
  const choices: CharacterPlan['choices'] = [];
  const answersByChoice = new Map<number, number>();
  const chosenOptions = new Set<number>();
  const answered = new Set<string>();
  for (const [i, c] of input.choices.entries()) {
    const path = `choices[${i}]`;
    const rule = ctx.choices.get(c.choiceId);
    if (!rule) { fail(`${path}.choiceId`, `Unknown choice ${c.choiceId}`); continue; }
    const targets = [c.optionId, c.language, c.equipment].filter((v) => v != null).length;
    if (targets !== 1) { fail(path, 'Answer a choice with exactly one of optionId, language or equipment'); continue; }
    let languageId: number | null = null;
    let equipmentId: number | null = null;
    if (c.optionId != null) {
      if (!rule.options.some((o) => o.id === c.optionId)) fail(`${path}.optionId`, `Option ${c.optionId} does not belong to choice ${c.choiceId}`);
      chosenOptions.add(c.optionId);
    } else if (c.language) {
      languageId = lookup(ctx.languages, c.language, `${path}.language`, 'language') ?? null;
      if (rule.pool !== 'ANY_LANGUAGE') fail(`${path}.language`, `Choice ${c.choiceId} is not a language choice`);
    } else if (c.equipment) {
      equipmentId = lookup(ctx.equipment, c.equipment, `${path}.equipment`, 'equipment') ?? null;
      if (rule.pool !== 'EQUIPMENT_CATEGORY') fail(`${path}.equipment`, `Choice ${c.choiceId} is not an equipment choice`);
      else if (equipmentId && !ctx.categoryMembers.get(rule.poolCategoryId!)?.has(equipmentId)) fail(`${path}.equipment`, `"${c.equipment}" is not in the category of choice ${c.choiceId}`);
    }
    const key = `${c.choiceId}:${c.optionId ?? ''}:${c.language ?? ''}:${c.equipment ?? ''}`;
    if (answered.has(key)) fail(path, `Same answer given twice to choice ${c.choiceId}`);
    answered.add(key);
    answersByChoice.set(c.choiceId, (answersByChoice.get(c.choiceId) ?? 0) + 1);
    choices.push({ choiceId: c.choiceId, optionId: c.optionId ?? null, languageId, equipmentId, level: null });
  }

  // Capacités et traits accordés par les options choisies (style de combat, ascendance draconique…)
  const grantedFeatures = new Set<number>();
  const grantedTraits = new Set<number>();
  for (const rule of ctx.choices.values()) {
    for (const o of rule.options) {
      if (!chosenOptions.has(o.id)) continue;
      for (const item of o.items) {
        if (item.classFeatureId) grantedFeatures.add(item.classFeatureId);
        if (item.traitId) grantedTraits.add(item.traitId);
      }
    }
  }
  const traitIds = new Set([...(ctx.race?.traitIds ?? []), ...(ctx.subrace?.traitIds ?? []), ...grantedTraits]);
  const positionOf = new Map(classes.map((c) => [c.classId, c.position]));
  const featureOwner = (featureId: number) => {
    for (const rule of ctx.classes.values()) {
      const f = rule.features.get(featureId);
      if (f) return { rule, feature: f };
    }
    return undefined;
  };
  const optionChoice = new Map<number, ChoiceRule>();
  for (const rule of ctx.choices.values()) for (const o of rule.options) optionChoice.set(o.id, rule);

  // Un choix est accessible si le personnage a son propriétaire ; renvoie la
  // montée de niveau qui le débloque (null : race, historique, création)
  const access = (rule: ChoiceRule, depth = 0): { ok: boolean; level: { classId: number; classLevel: number } | null } => {
    const o = rule.owner;
    const no = { ok: false, level: null };
    if (o.raceId != null) return { ok: o.raceId === ctx.race?.id, level: null };
    if (o.subraceId != null) return { ok: o.subraceId === ctx.subrace?.id, level: null };
    if (o.traitId != null) return { ok: traitIds.has(o.traitId), level: null };
    if (o.backgroundId != null) return { ok: o.backgroundId === ctx.background?.id, level: null };
    if (o.classId != null) {
      const position = positionOf.get(o.classId);
      if (position === undefined) return no;
      // Classe de départ : maîtrises et équipement ; classes suivantes : maîtrises de multiclassage
      const ok = rule.kind === 'MULTICLASS_PROFICIENCY' ? position > 0 : position === 0;
      return { ok, level: { classId: o.classId, classLevel: 1 } };
    }
    if (o.subclassId != null) {
      const cls = classes.find((c) => c.subclassId === o.subclassId);
      const rule2 = cls && [...ctx.classes.values()].find((r) => r.id === cls.classId);
      return cls && rule2 ? { ok: true, level: { classId: cls.classId, classLevel: rule2.subclassLevel } } : no;
    }
    if (o.classFeatureId != null) {
      const owner = featureOwner(o.classFeatureId);
      if (!owner) return no;
      const reached = classLevel.get(owner.rule.id) ?? 0;
      const level = { classId: owner.rule.id, classLevel: Math.max(owner.feature.level, 1) };
      if (grantedFeatures.has(o.classFeatureId)) return { ok: reached > 0, level };
      const subclassOk = owner.feature.subclassId == null || chosenSubclasses.has(owner.feature.subclassId);
      return { ok: reached >= owner.feature.level && subclassOk, level };
    }
    if (o.parentOptionId != null && depth < 5) {
      const parent = optionChoice.get(o.parentOptionId);
      if (!parent || !chosenOptions.has(o.parentOptionId)) return no;
      return access(parent, depth + 1);
    }
    return no;
  };

  for (const [i, c] of choices.entries()) {
    const rule = ctx.choices.get(c.choiceId)!;
    const { ok, level } = access(rule);
    if (!ok) fail(`choices[${i}].choiceId`, `Choice ${c.choiceId} is not available to this character`);
    if (level && classLevel.has(level.classId) && level.classLevel <= classLevel.get(level.classId)!) c.level = level;
  }
  const pendingChoices: CharacterSheet['pending']['choices'] = [];
  const availableChoices: number[] = [];
  for (const rule of ctx.choices.values()) {
    const given = answersByChoice.get(rule.id) ?? 0;
    if (rule.choose > 0 && given > rule.choose) fail('choices', `Choice ${rule.id} allows ${rule.choose} answer(s), got ${given}`);
    if (rule.choose === 0 || !access(rule).ok) continue;
    availableChoices.push(rule.id);
    if (rule.choose > given) pendingChoices.push({ choiceId: rule.id, kind: rule.kind, remaining: rule.choose - given });
  }

  // --- Caractéristiques finales (pour le multiclassage et les dons) ---
  const bonus = new Map<number, number>();
  const add = (abilityScoreId: number, value: number) => bonus.set(abilityScoreId, (bonus.get(abilityScoreId) ?? 0) + value);
  for (const [id, value] of ctx.race?.bonuses ?? []) add(id, value);
  for (const [id, value] of ctx.subrace?.bonuses ?? []) add(id, value);
  for (const rule of ctx.choices.values()) {
    for (const o of rule.options) {
      if (!chosenOptions.has(o.id)) continue;
      for (const item of o.items) if (item.abilityScoreId && item.bonus) add(item.abilityScoreId, item.bonus);
    }
  }
  const improved = new Set<number>();
  for (const c of classes) for (const l of c.levels) for (const inc of l.abilityIncreases) { add(inc.abilityScoreId, inc.bonus); improved.add(inc.abilityScoreId); }
  const total = (abilityScoreId: number) => (abilityScores.find((a) => a.abilityScoreId === abilityScoreId)?.score ?? 10) + (bonus.get(abilityScoreId) ?? 0);
  for (const [ability, abilityScoreId] of ctx.abilities) {
    if (improved.has(abilityScoreId) && total(abilityScoreId) > 20) fail(`abilityScores.${ability}`, 'Ability score improvements cannot raise a score above 20');
  }
  const meets = (reqs: { abilityScoreId: number; minimumScore: number; alternativeGroup: number }[]) => {
    const groups = new Map<number, boolean>();
    for (const r of reqs) groups.set(r.alternativeGroup, (groups.get(r.alternativeGroup) ?? false) || total(r.abilityScoreId) >= r.minimumScore);
    return [...groups.values()].every(Boolean);
  };
  if (classes.length > 1) {
    for (const c of input.classes) {
      const rule = ctx.classes.get(c.class);
      if (rule && !meets(rule.multiclassRequirements)) fail('classes', `Ability scores do not meet the multiclass requirements of ${c.class}`);
    }
  }
  for (const c of input.classes) {
    for (const l of c.levels) {
      const feat = l.feat ? ctx.feats.get(l.feat) : undefined;
      if (feat && !meets(feat.prerequisites)) fail('classes', `Ability scores do not meet the prerequisites of feat ${l.feat}`);
    }
  }

  // --- Sorts ---
  const spells: CharacterPlan['spells'] = [];
  const spellCounts = new Map<string, { cantrips: number; known: number }>();
  for (const [i, s] of input.spells.entries()) {
    const path = `spells[${i}]`;
    const spell = lookup(ctx.spells, s.spell, `${path}.spell`, 'spell');
    const rule = ctx.classes.get(s.class);
    const reached = rule ? classLevel.get(rule.id) : undefined;
    if (!rule || !reached) { fail(`${path}.class`, `The character has no level in class "${s.class}"`); continue; }
    if (!spell) continue;
    const subclassId = classes.find((c) => c.classId === rule.id)?.subclassId;
    const onList = rule.spellIds.has(spell.id) || (subclassId != null && ctx.subclassSpells.get(subclassId)?.has(spell.id));
    if (!onList) fail(`${path}.spell`, `"${s.spell}" is not on the ${s.class} spell list`);
    const lvl = rule.levels.get(reached);
    if (spell.level === 0 && !(lvl?.cantripsKnown)) fail(`${path}.spell`, `${s.class} level ${reached} knows no cantrip`);
    if (spell.level > 0 && spell.level > (lvl?.maxSpellLevel ?? 0)) fail(`${path}.spell`, `${s.class} level ${reached} cannot cast level ${spell.level} spells`);
    const counts = spellCounts.get(s.class) ?? { cantrips: 0, known: 0 };
    if (spell.level === 0) counts.cantrips++; else counts.known++;
    spellCounts.set(s.class, counts);
    spells.push({ classId: rule.id, spellId: spell.id, prepared: s.prepared });
  }
  for (const [cls, counts] of spellCounts) {
    const rule = ctx.classes.get(cls)!;
    const lvl = rule.levels.get(classLevel.get(rule.id)!);
    if (lvl?.cantripsKnown != null && counts.cantrips > lvl.cantripsKnown) fail('spells', `${cls} knows at most ${lvl.cantripsKnown} cantrips`);
    if (lvl?.spellsKnown != null && counts.known > lvl.spellsKnown) fail('spells', `${cls} knows at most ${lvl.spellsKnown} spells`);
  }
  const seenSpells = new Set(spells.map((s) => `${s.classId}:${s.spellId}`));
  if (seenSpells.size !== spells.length) fail('spells', 'A spell is listed twice for the same class');

  // --- Inventaire, argent, personnalité, états ---
  const items: CharacterPlan['items'] = [];
  for (const [i, item] of input.items.entries()) {
    const equipmentId = item.equipment ? lookup(ctx.equipment, item.equipment, `items[${i}].equipment`, 'equipment') ?? null : null;
    if (!item.equipment && !item.name) fail(`items[${i}]`, 'An item needs an equipment index or a name');
    items.push({ equipmentId, name: item.name ?? null, description: item.description ?? null, quantity: item.quantity, equipped: item.equipped, attuned: item.attuned, position: i });
  }
  if (items.filter((i) => i.attuned).length > MAX_ATTUNED) fail('items', `At most ${MAX_ATTUNED} attuned items`);

  const personality: CharacterPlan['personality'] = [];
  for (const [i, p] of input.personality.entries()) {
    const path = `personality[${i}]`;
    if ((p.optionId != null) === !!p.text) { fail(path, 'Give either optionId or text'); continue; }
    if (p.optionId != null) {
      const kind = ctx.background?.personality.get(p.optionId);
      if (!kind) fail(`${path}.optionId`, `Option ${p.optionId} is not in the background personality tables`);
      else if (kind !== p.kind) fail(`${path}.kind`, `Option ${p.optionId} is a ${kind}`);
    }
    personality.push({ kind: p.kind, optionId: p.optionId ?? null, customText: p.text ?? null });
  }

  const conditionIds = input.conditions.map((c, i) => lookup(ctx.conditions, c, `conditions[${i}]`, 'condition')).filter((id): id is number => !!id);

  const featureUsage: CharacterPlan['featureUsage'] = [];
  for (const [i, u] of input.state.featureUsage.entries()) {
    const path = `state.featureUsage[${i}]`;
    if (!!u.feature === !!u.trait) { fail(path, 'Give either feature or trait'); continue; }
    if (u.trait) {
      const traitId = lookup(ctx.traits, u.trait, `${path}.trait`, 'trait');
      if (traitId && !traitIds.has(traitId)) fail(`${path}.trait`, `The character does not have trait "${u.trait}"`);
      if (traitId) featureUsage.push({ classFeatureId: null, traitId, used: u.used });
      continue;
    }
    const entry = [...ctx.classes.values()].flatMap((r) => [...r.features].map(([id, f]) => ({ id, f, r }))).find((x) => x.f.index === u.feature);
    if (!entry) { fail(`${path}.feature`, `Unknown feature "${u.feature}" for the character's classes`); continue; }
    const reached = classLevel.get(entry.r.id) ?? 0;
    const subclassOk = entry.f.subclassId == null || chosenSubclasses.has(entry.f.subclassId);
    if (!grantedFeatures.has(entry.id) && (reached < entry.f.level || !subclassOk)) fail(`${path}.feature`, `The character does not have feature "${u.feature}"`);
    featureUsage.push({ classFeatureId: entry.id, traitId: null, used: u.used });
  }

  // --- Fiche calculée ---
  const sheetScores: CharacterSheet['abilityScores'] = {};
  for (const [ability, abilityScoreId] of ctx.abilities) {
    const base = input.abilityScores[ability] ?? 10;
    const b = bonus.get(abilityScoreId) ?? 0;
    sheetScores[ability] = { base, bonus: b, total: base + b, modifier: modifier(base + b) };
  }
  const conMod = ctx.constitutionId ? modifier(total(ctx.constitutionId)) : 0;
  let maxHitPoints = 0;
  for (const c of classes) {
    const rule = [...ctx.classes.values()].find((r) => r.id === c.classId)!;
    for (const l of c.levels) {
      const gained = l.characterLevel === 1 ? rule.hitDie : l.hitPointRoll ?? rule.hitDie / 2 + 1;
      maxHitPoints += Math.max(gained + conMod, 1);
    }
  }
  const sheet: CharacterSheet = {
    level: totalLevel,
    proficiencyBonus: proficiencyBonus(totalLevel),
    maxHitPoints,
    abilityScores: sheetScores,
    pending: { subclasses: pendingSubclasses, abilityScoreImprovements: pendingAsi, choices: pendingChoices },
  };

  if (errors.length || !ctx.race) return { plan: null, errors, sheet, availableChoices };

  const s = input.state;
  return {
    errors,
    sheet,
    availableChoices,
    plan: {
      core: {
        editionId: ctx.edition.id,
        name: input.name,
        raceId: ctx.race.id,
        subraceId: ctx.subrace?.id ?? null,
        backgroundId: ctx.background?.id ?? null,
        alignmentId: ctx.alignmentId,
        abilityMethod: input.abilityMethod,
        experiencePoints: s.experiencePoints,
        currentHitPoints: s.currentHitPoints ?? null,
        temporaryHitPoints: s.temporaryHitPoints,
        deathSaveSuccesses: s.deathSaveSuccesses,
        deathSaveFailures: s.deathSaveFailures,
        inspiration: s.inspiration,
        appearance: input.appearance ?? null,
        backstory: input.backstory ?? null,
        notes: input.notes ?? null,
        portraitUrl: input.portraitUrl ?? null,
      },
      abilityScores,
      classes,
      choices,
      spells,
      items,
      currencies: Object.entries(input.currencies).map(([currency, amount]) => ({ currency: currency as Currency, amount })),
      personality,
      conditionIds,
      spellSlotUsage: s.spellSlotsUsed.map((u) => ({ spellLevel: u.level, pact: u.pact, used: u.used })),
      featureUsage,
    },
  };
}
