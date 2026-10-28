// Monstres : le bloc de statistiques du SRD est décomposé en tables (défenses,
// langues, actions, attaques multiples, incantation, formes). Les chaînes
// ("bludgeoning, piercing, and slashing from nonmagical weapons",
// "Melee Weapon Attack: +9 to hit, reach 10 ft.") sont analysées ici ; le
// texte affiché reste en traduction.
import { ArmorClassSource, DamageModifierKind, MonsterActionKind, MonsterAttackType, PrismaClient, SaveSuccess, Size } from '@prisma/client';
import { DiceSchema, MonsterSpeedsSchema, MonsterUsage, MonsterUsageSchema, SensesSchema, SpellSlotsSchema } from '../../srd/jsonb';
import { Json, loadSrd, LocaleCode, log, parseUrl, readJson, Refs, replaceTranslations, SrdFile, text, translationsFor, TX_OPTIONS, Tx } from '../context';

const DAMAGE_TYPES = new Set(['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']);
const ALIGNMENTS = ['lawful-good', 'neutral-good', 'chaotic-good', 'lawful-neutral', 'neutral', 'chaotic-neutral', 'lawful-evil', 'neutral-evil', 'chaotic-evil'];

interface Labels {
  creatureSubtypes: Record<string, Record<LocaleCode, string>>;
  damageNotes: Record<string, string>;
  languageSegments: Record<string, string>;
  languagePhrases: [string, string][];
  extraLanguages: Record<string, string>;
}

function feet(value: string): number {
  const m = /^(\d+) ft\./.exec(value);
  if (!m) throw new Error(`Distance non reconnue : "${value}"`);
  return Number(m[1]);
}

// { walk: "10 ft.", hover: true } → { walk: 10, hover: true }
export function parseSpeeds(speed: Record<string, string | boolean>) {
  return MonsterSpeedsSchema.parse(Object.fromEntries(
    Object.entries(speed).map(([key, value]) => [key, key === 'hover' ? Boolean(value) : feet(String(value))]),
  ));
}

// { blindsight: "60 ft. (blind beyond this radius)" } → { blindsight: 60, blindBeyond: true }
export function parseSenses(senses: Record<string, string | number>) {
  const out: Record<string, number | true> = {};
  for (const [key, value] of Object.entries(senses)) {
    if (key === 'passive_perception') continue;
    out[key] = feet(String(value));
    if (/blind beyond/.test(String(value))) out.blindBeyond = true;
  }
  return SensesSchema.parse(out);
}

// "18d10+36" → 18 dés de 10, +36
export function parseHitDice(roll: string) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(roll.replace(/\s/g, ''));
  if (!m) throw new Error(`Dés de vie non reconnus : "${roll}"`);
  return { hitDiceCount: Number(m[1]), hitDieSize: Number(m[2]), hitPointBonus: Number(m[3] ?? 0) };
}

// "swarm of Tiny beasts" → bête, nuée de créatures Très Petites
export function parseType(type: string): { creatureType: string; swarmOfSize: Size | null } {
  const m = /^swarm of (\w+) (\w+?)s?$/.exec(type);
  return m ? { creatureType: m[2], swarmOfSize: m[1].toUpperCase() as Size } : { creatureType: type, swarmOfSize: null };
}

// "any non-good alignment" → les six alignements non bons ; "unaligned" → sans alignement
export function parseAlignment(value: string): { isUnaligned: boolean; alignments: string[] } {
  if (value === 'unaligned') return { isUnaligned: true, alignments: [] };
  const axes = (a: string) => (a === 'neutral' ? ['neutral', 'neutral'] : a.split('-'));
  const any = /^any(?: non-(\w+)| (\w+))? alignment$/.exec(value);
  if (any) {
    const [, excluded, only] = any;
    return { isUnaligned: false, alignments: ALIGNMENTS.filter((a) => (excluded ? !axes(a).includes(excluded) : only ? axes(a).includes(only) : true)) };
  }
  // "neutral good (50%) or neutral evil (50%)"
  const alignments = value.replace(/ \(\d+%\)/g, '').split(' or ').map((v) => v.trim().replace(' ', '-'));
  const unknown = alignments.filter((a) => !ALIGNMENTS.includes(a));
  if (unknown.length) throw new Error(`Alignement non reconnu : "${value}"`);
  return { isUnaligned: false, alignments };
}

export interface DamageModifierRow { damageType: string | null; nonMagicalOnly: boolean; note: string | null }

// "bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered"
// → 3 lignes, non magiques seulement, précision "that aren't silvered"
export function parseDamageModifier(value: string): DamageModifierRow[] {
  if (DAMAGE_TYPES.has(value)) return [{ damageType: value, nonMagicalOnly: false, note: null }];
  const m = /^([a-z, ]+?) from (nonmagical|magic) (?:weapons|attacks)\s*(.*)$/.exec(value);
  if (!m) return [{ damageType: null, nonMagicalOnly: false, note: value }]; // "damage from spells"
  const types = m[1].split(/,? and |, /).map((t) => t.trim());
  if (types.some((t) => !DAMAGE_TYPES.has(t))) throw new Error(`Type de dégâts non reconnu : "${value}"`);
  const nonMagicalOnly = m[2] === 'nonmagical';
  const note = nonMagicalOnly ? m[3] || null : value.slice(m[1].length + 1);
  return types.map((damageType) => ({ damageType, nonMagicalOnly, note }));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (s: string, flags = '') => new RegExp(`(?<![\\w'])${escape(s)}(?![\\w])`, flags);

// "Abyssal, understands Common but can't speak, telepathy 120 ft." →
// abyssal (parlé), common (compris seulement), télépathie 120 pieds
export function parseLanguages(value: string, languages: Map<string, string>, extra: string[]) {
  const telepathy = /telepathy (\d+) ft\./.exec(value);
  // Les précisions entre parenthèses et les langues hors SRD ("Giant Eagle") ne désignent pas une langue du SRD
  let searched = value.replace(/\([^)]*\)/g, (s) => ' '.repeat(s.length));
  for (const name of extra) searched = searched.replace(word(name, 'g'), (s) => ' '.repeat(s.length));
  const understands = searched.search(/understands/);
  const found = new Map<string, boolean>();
  for (const [name, index] of languages) {
    const at = searched.search(word(name, 'i'));
    if (at < 0) continue;
    const understandOnly = understands >= 0 && at > understands;
    found.set(index, (found.get(index) ?? true) && understandOnly);
  }
  return {
    telepathyFt: telepathy ? Number(telepathy[1]) : null,
    languages: [...found].map(([index, understandOnly]) => ({ index, understandOnly })),
  };
}

// Ligne "Langues" en français : segments connus, puis expressions et noms de langues
export function translateLanguages(value: string, labels: Labels, names: Map<string, string>): string {
  const allNames = [...Object.entries(labels.extraLanguages), ...names].sort((a, b) => b[0].length - a[0].length);
  return value.split(/, (?![^()]*\))/).map((segment) => {
    if (labels.languageSegments[segment]) return labels.languageSegments[segment];
    let out = segment.replace(/telepathy (\d+) ft\./, (_, ft) => `télépathie à ${Math.round(Number(ft) * 0.3)} m`);
    for (const [en, fr] of labels.languagePhrases) out = out.replace(word(en, 'g'), fr);
    for (const [en, fr] of allNames) out = out.replace(word(en, 'g'), fr);
    return out;
  }).join(', ');
}

const ATTACK_TYPES: Record<string, MonsterAttackType> = {
  'Melee or Ranged Weapon': 'MELEE_OR_RANGED_WEAPON',
  'Melee Weapon': 'MELEE_WEAPON',
  'Ranged Weapon': 'RANGED_WEAPON',
  'Melee Spell': 'MELEE_SPELL',
  'Ranged Spell': 'RANGED_SPELL',
};

// "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft."
export function parseAttack(desc: string) {
  const m = /^\s*(Melee or Ranged Weapon|Melee Weapon|Ranged Weapon|Melee Spell|Ranged Spell) Attack:/.exec(desc);
  const reach = /reach (\d+) ft\./.exec(desc);
  const range = /range (\d+)(?:\/(\d+))? ft\./.exec(desc);
  return {
    attackType: m ? ATTACK_TYPES[m[1]] : null,
    reachFt: m && reach ? Number(reach[1]) : null,
    normalRangeFt: m && range ? Number(range[1]) : null,
    longRangeFt: m && range?.[2] ? Number(range[2]) : null,
  };
}

export function parseUsage(usage: Json): MonsterUsage | null {
  if (!usage) return null;
  const value = {
    'recharge on roll': () => ({ type: 'recharge', dice: usage.dice, minValue: usage.min_value }),
    'per day': () => ({ type: 'per_day', times: usage.times }),
    'recharge after rest': () => ({ type: 'per_rest', rests: usage.rest_types }),
    'at will': () => ({ type: 'at_will' }),
  }[usage.type as string];
  if (!value) throw new Error(`Usage non reconnu : ${JSON.stringify(usage)}`);
  return MonsterUsageSchema.parse(value());
}

// Dégâts d'une action ; les dégâts au choix ("foudre ou tonnerre", souffles) forment un groupe d'alternatives
export function parseDamages(action: Json): { dice: string; damageType: string; alternativeGroup: number | null }[] {
  const rows: { dice: string; damageType: string; alternativeGroup: number | null }[] = [];
  let group = 0;
  const push = (d: Json, alternativeGroup: number | null) =>
    rows.push({ dice: DiceSchema.parse(d.damage_dice.replace(/\s/g, '')), damageType: d.damage_type.index, alternativeGroup });
  for (const d of action.damage ?? []) {
    if (d.damage_dice) push(d, null);
    else if (d.from) {
      group += 1;
      for (const option of d.from.options) if (option.damage_dice) push(option, group);
    }
  }
  if (action.options?.from) {
    group += 1;
    for (const option of action.options.from.options) for (const d of option.damage ?? []) push(d, group);
  }
  return rows;
}

// Attaques multiples : étapes (action ciblée, nombre) ; un groupe par alternative
export function parseMultiattack(action: Json): { name: string; count: number; alternativeGroup: number }[] {
  const steps: { name: string; count: number; alternativeGroup: number }[] = [];
  const add = (item: Json, alternativeGroup: number) => {
    // "Number of Heads" (hydre), "1d4" : nombre variable, décrit dans le texte
    if (Number.isInteger(item.count)) steps.push({ name: item.action_name, count: item.count, alternativeGroup });
  };
  for (const item of action.actions ?? []) add(item, 1);
  (action.action_options?.from.options ?? []).forEach((option: Json, i: number) => {
    for (const item of option.option_type === 'multiple' ? option.items : [option]) add(item, i + 1);
  });
  return steps;
}

const GROUPS: [string, MonsterActionKind][] = [
  ['special_abilities', 'TRAIT'],
  ['actions', 'ACTION'],
  ['reactions', 'REACTION'],
  ['legendary_actions', 'LEGENDARY'],
];

export async function importMonsters(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const monsters = loadSrd(edition, 'Monsters');
  const labels: Labels = readJson(`${edition}/custom/monster-labels.json`);

  // Sous-types (référentiel partagé)
  for (const [index, names] of Object.entries(labels.creatureSubtypes)) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.creatureSubtype.upsert({ where: { index }, create: { index }, update: {} });
      await replaceTranslations(tx, 'creatureSubtypeTranslation', 'creatureSubtypeId', row.id,
        Object.entries(names).map(([localeCode, name]) => ({ localeCode, data: { name } })));
    }, TX_OPTIONS);
  }
  refs.reset('creatureSubtype');

  // Langues : nom anglais → index, et nom français pour la ligne traduite
  const languageFile = loadSrd(edition, 'Languages');
  const languageIndexes = new Map(languageFile.list.map((l: Json) => [l.name as string, l.index as string]));
  const frLanguageNames = new Map(languageFile.list.map((l: Json) => [l.name as string, languageFile.get('fr', l.index)?.name ?? l.name]));

  await refs.preload('creatureType', 'creatureSubtype', 'alignment', 'abilityScore', 'skill', 'damageType', 'condition', 'language', 'equipment', 'spell', 'class');
  for (const en of monsters.list as Json[]) {
    const data = await monsterData(en, refs, languageIndexes, labels);
    await prisma.$transaction(async (tx) => {
      const row = await tx.monster.upsert({
        where: { editionId_index: { editionId, index: en.index } },
        create: { editionId, index: en.index, ...data.columns },
        update: data.columns,
      });
      await replaceTranslations(tx, 'monsterTranslation', 'monsterId', row.id,
        translationsFor(monsters, en.index, (r, locale) => ({
          name: r.name,
          description: text(r.desc),
          languagesText: en.languages ? (locale === 'en' ? en.languages : translateLanguages(en.languages, labels, frLanguageNames)) : null,
        })));
      await writeChildren(tx, row.id, en, monsters, data, refs, labels);
    }, TX_OPTIONS);
  }
  refs.reset('monster');

  // Formes (métamorphes) : une fois tous les monstres créés
  await refs.preload('monster');
  let forms = 0;
  for (const en of monsters.list as Json[]) {
    const monsterId = await refs.id('monster', en.index);
    await prisma.monsterForm.deleteMany({ where: { monsterId } });
    for (const form of en.forms ?? []) {
      await prisma.monsterForm.create({ data: { monsterId, formMonsterId: await refs.id('monster', form.index) } });
      forms += 1;
    }
  }
  log(`monstres : ${monsters.list.length} (${forms} liens de forme)`);
}

async function monsterData(en: Json, refs: Refs, languageIndexes: Map<string, string>, labels: Labels) {
  const { creatureType, swarmOfSize } = parseType(en.type);
  const { isUnaligned, alignments } = parseAlignment(en.alignment);
  const languages = parseLanguages(en.languages, languageIndexes, Object.keys(labels.extraLanguages));
  return {
    alignments,
    languages: languages.languages,
    columns: {
      size: en.size.toUpperCase() as Size,
      creatureTypeId: await refs.id('creatureType', creatureType),
      swarmOfSize,
      isUnaligned,
      hitPoints: en.hit_points,
      ...parseHitDice(en.hit_points_roll),
      speeds: parseSpeeds(en.speed),
      strength: en.strength,
      dexterity: en.dexterity,
      constitution: en.constitution,
      intelligence: en.intelligence,
      wisdom: en.wisdom,
      charisma: en.charisma,
      senses: parseSenses(en.senses),
      passivePerception: en.senses.passive_perception,
      telepathyFt: languages.telepathyFt,
      challengeRating: en.challenge_rating,
      xp: en.xp,
      // Toutes les créatures légendaires du SRD 5.1 ont 3 actions légendaires par round
      legendaryActionsPerRound: en.legendary_actions?.length ? 3 : null,
      // Images de dnd5eapi.co générées par IA (Stable Diffusion) : non reprises
      imageUrl: null,
    },
  };
}

async function writeChildren(tx: Tx, monsterId: number, en: Json, file: SrdFile, data: Awaited<ReturnType<typeof monsterData>>, refs: Refs, labels: Labels) {
  const fr = file.get('fr', en.index);
  for (const model of ['monsterSubtype', 'monsterAlignment', 'monsterArmorClass', 'monsterSavingThrow', 'monsterSkill', 'monsterDamageModifier', 'monsterConditionImmunity', 'monsterLanguage', 'monsterAction']) {
    await (tx as any)[model].deleteMany({ where: { monsterId } });
  }

  const subtypes = en.subtype ? String(en.subtype).split(', ').map((s) => s.replace(/ /g, '-')) : [];
  await tx.monsterSubtype.createMany({ data: await Promise.all(subtypes.map(async (s) => ({ monsterId, creatureSubtypeId: await refs.id('creatureSubtype', s) }))) });
  await tx.monsterAlignment.createMany({ data: await Promise.all(data.alignments.map(async (a) => ({ monsterId, alignmentId: await refs.id('alignment', a) }))) });

  // Classe d'armure : une ligne par valeur ("12 (15 avec armure de mage)")
  for (const [position, ac] of (en.armor_class as Json[]).entries()) {
    const row = await tx.monsterArmorClass.create({
      data: {
        monsterId,
        position,
        value: ac.value,
        sourceType: (ac.type === 'dex' ? 'DEXTERITY' : ac.type.toUpperCase()) as ArmorClassSource,
        spellId: ac.spell ? await refs.id('spell', ac.spell.index) : null,
        conditionId: ac.condition ? await refs.id('condition', ac.condition.index) : null,
      },
    });
    for (const armor of ac.armor ?? []) {
      await tx.monsterArmorClassEquipment.create({ data: { armorClassId: row.id, equipmentId: await refs.id('equipment', armor.index) } });
    }
    if (ac.desc) {
      const notes = [{ localeCode: 'en', data: { note: ac.desc } }];
      const frNote = fr?.armor_class?.[position]?.desc;
      if (frNote) notes.push({ localeCode: 'fr', data: { note: frNote } });
      await replaceTranslations(tx, 'monsterArmorClassTranslation', 'armorClassId', row.id, notes);
    }
  }

  // Maîtrises : jets de sauvegarde et compétences avec leur bonus total
  for (const p of en.proficiencies as Json[]) {
    const index: string = p.proficiency.index;
    if (index.startsWith('saving-throw-')) {
      await tx.monsterSavingThrow.create({ data: { monsterId, abilityScoreId: await refs.id('abilityScore', index.slice(13)), bonus: p.value } });
    } else if (index.startsWith('skill-')) {
      await tx.monsterSkill.create({ data: { monsterId, skillId: await refs.id('skill', index.slice(6)), bonus: p.value } });
    } else throw new Error(`Maîtrise de monstre non reconnue : ${index}`);
  }

  const kinds: [string, DamageModifierKind][] = [['damage_vulnerabilities', 'VULNERABILITY'], ['damage_resistances', 'RESISTANCE'], ['damage_immunities', 'IMMUNITY']];
  for (const [field, kind] of kinds) {
    for (const value of en[field] as string[]) {
      for (const m of parseDamageModifier(value)) {
        const row = await tx.monsterDamageModifier.create({
          data: { monsterId, kind, damageTypeId: m.damageType ? await refs.id('damageType', m.damageType) : null, nonMagicalOnly: m.nonMagicalOnly },
        });
        if (m.note) {
          const notes = [{ localeCode: 'en', data: { note: m.note } }];
          if (labels.damageNotes[m.note]) notes.push({ localeCode: 'fr', data: { note: labels.damageNotes[m.note] } });
          await replaceTranslations(tx, 'monsterDamageModifierTranslation', 'damageModifierId', row.id, notes);
        }
      }
    }
  }

  await tx.monsterConditionImmunity.createMany({
    data: await Promise.all((en.condition_immunities as Json[]).map(async (c) => ({ monsterId, conditionId: await refs.id('condition', c.index) }))),
    skipDuplicates: true, // certains monstres listent deux fois le même état
  });
  await tx.monsterLanguage.createMany({
    data: await Promise.all(data.languages.map(async (l) => ({ monsterId, languageId: await refs.id('language', l.index), understandOnly: l.understandOnly }))),
  });

  await writeActions(tx, monsterId, en, fr, refs);
}

// Les attaques multiples nomment parfois l'action autrement : "Claws" pour "Claw",
// "Claw" pour "Claw (Oni Form Only)"
export const actionKey = (name: string) => name.replace(/\s*\(.*\)$/, '').replace(/s$/, '').toLowerCase();

async function writeActions(tx: Tx, monsterId: number, en: Json, fr: Json | undefined, refs: Refs) {
  const byName = new Map<string, number>();
  const multiattacks: { id: number; action: Json }[] = [];
  let position = 0;
  for (const [field, kind] of GROUPS) {
    for (const [i, action] of ((en[field] ?? []) as Json[]).entries()) {
      const dc = action.dc ?? (action.damage as Json[] | undefined)?.find((d) => d.dc)?.dc;
      const cost = /\(Costs (\d) Actions\)/.exec(action.name);
      const usage = parseUsage(action.usage);
      const row = await tx.monsterAction.create({
        data: {
          monsterId,
          kind,
          position: position++,
          ...parseAttack(action.desc),
          attackBonus: action.attack_bonus ?? null,
          saveAbilityId: dc ? await refs.id('abilityScore', dc.dc_type.index) : null,
          saveDc: dc?.dc_value ?? null,
          saveSuccess: dc ? (dc.success_type.toUpperCase() as SaveSuccess) : null,
          usage: usage ?? undefined,
          legendaryCost: kind === 'LEGENDARY' ? Number(cost?.[1] ?? 1) : null,
        },
      });
      if (!byName.has(actionKey(action.name))) byName.set(actionKey(action.name), row.id);
      const translations = [{ localeCode: 'en', data: { name: action.name, description: action.desc } }];
      const frAction = fr?.[field]?.[i];
      if (frAction) translations.push({ localeCode: 'fr', data: { name: frAction.name, description: frAction.desc } });
      await replaceTranslations(tx, 'monsterActionTranslation', 'actionId', row.id, translations);

      const damages = parseDamages(action);
      if (damages.length) {
        await tx.monsterActionDamage.createMany({
          data: await Promise.all(damages.map(async (d, p) => ({
            actionId: row.id, position: p, dice: d.dice, damageTypeId: await refs.id('damageType', d.damageType), alternativeGroup: d.alternativeGroup,
          }))),
        });
      }
      if (action.multiattack_type) multiattacks.push({ id: row.id, action });
      if (action.spellcasting) await writeSpellcasting(tx, monsterId, row.id, action.spellcasting, refs);
    }
  }

  for (const { id, action } of multiattacks) {
    for (const [p, step] of parseMultiattack(action).entries()) {
      const targetActionId = byName.get(actionKey(step.name));
      if (!targetActionId) throw new Error(`Attaques multiples de ${en.index} : action "${step.name}" introuvable`);
      await tx.monsterMultiattackStep.create({ data: { multiattackId: id, targetActionId, position: p, count: step.count, alternativeGroup: step.alternativeGroup } });
    }
  }
}

async function writeSpellcasting(tx: Tx, monsterId: number, actionId: number, sc: Json, refs: Refs) {
  const row = await tx.monsterSpellcasting.create({
    data: {
      monsterId,
      actionId,
      abilityScoreId: await refs.id('abilityScore', sc.ability.index),
      saveDc: sc.dc ?? null,
      attackBonus: sc.modifier ?? null,
      casterLevel: sc.level ?? null,
      classId: sc.school ? await refs.id('class', sc.school) : null,
      slots: sc.slots ? SpellSlotsSchema.parse(sc.slots) : undefined,
    },
  });
  await tx.monsterSpell.createMany({
    data: await Promise.all((sc.spells as Json[]).map(async (s) => ({
      spellcastingId: row.id,
      spellId: await refs.id('spell', parseUrl(s.url)[1]),
      usage: parseUsage(s.usage) ?? undefined,
    }))),
  });
}
