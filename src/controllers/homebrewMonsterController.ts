import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prismaClient';
import { detailInclude, monsterDetail, monsterSummary, summaryInclude } from '../monsters/serialize';
import { allLangs, pick, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';
import { CR_XP, HomebrewAction, HomebrewMonsterInput, homebrewMonsterSchema } from '../validators/monsterValidator';

// Monstres maison : visibles et utilisables par leur seul auteur (bestiaire
// personnel, rencontres de ses campagnes). Même format que le bestiaire du SRD.

type Issue = { path: string; message: string };
const userIdOf = (req: Request): number => (req as Request & { user: { id: number } }).user.id;
const mine = (req: Request) => ({ ownerId: userIdOf(req), source: 'HOMEBREW' as const });
const named = { select: { id: true, index: true, translations: allLangs } } as const;

function fail(res: Response, what: string, error: unknown) {
  logger.error(`Error ${what}: ${error instanceof Error ? error.message : error}`);
  res.status(500).json({ message: `Error ${what}` });
}

// Identifiant lisible et unique : « gobelin-des-marais-3f9a1c »
const slug = (name: string) => `${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'monstre'}-${randomBytes(3).toString('hex')}`;
const modifier = (score: number) => Math.floor((score - 10) / 2);

// Index du formulaire → id de la base ; erreurs avec leur chemin
async function resolveReferences(input: HomebrewMonsterInput) {
  const actions = [...input.traits, ...input.actions, ...input.bonusActions, ...input.reactions, ...input.legendaryActions, ...input.lairActions];
  const damageIndexes = [...input.damageVulnerabilities, ...input.damageResistances, ...input.damageImmunities].map((d) => d.damageType)
    .concat(actions.flatMap((a) => a.damages.map((d) => d.damageType)));
  const abilityIndexes = [...input.savingThrows.map((s) => s.ability), ...actions.flatMap((a) => (a.save ? [a.save.ability] : []))];
  const [edition, types, alignments, abilities, skills, damageTypes, conditions] = await Promise.all([
    prisma.edition.findFirst({ where: { isDefault: true }, select: { id: true } }),
    prisma.creatureType.findMany({ where: { index: input.type }, select: { id: true, index: true } }),
    prisma.alignment.findMany({ where: { index: input.alignment ?? '' }, select: { id: true, index: true } }),
    prisma.abilityScore.findMany({ where: { index: { in: abilityIndexes } }, select: { id: true, index: true } }),
    prisma.skill.findMany({ where: { index: { in: input.skills.map((s) => s.skill) } }, select: { id: true, index: true } }),
    prisma.damageType.findMany({ where: { index: { in: damageIndexes } }, select: { id: true, index: true } }),
    prisma.condition.findMany({ where: { index: { in: input.conditionImmunities } }, select: { id: true, index: true } }),
  ]);
  const errors: Issue[] = [];
  const lookup = (rows: { id: number; index: string }[], value: string, path: string) => {
    const row = rows.find((r) => r.index === value);
    if (!row) errors.push({ path, message: `Unknown "${value}"` });
    return row?.id ?? 0;
  };
  const ids = {
    editionId: edition?.id ?? 0,
    creatureTypeId: lookup(types, input.type, 'type'),
    alignmentId: input.alignment ? lookup(alignments, input.alignment, 'alignment') : null,
    ability: (v: string, path: string) => lookup(abilities, v, path),
    skill: (v: string, path: string) => lookup(skills, v, path),
    damageType: (v: string, path: string) => lookup(damageTypes, v, path),
    condition: (v: string, path: string) => lookup(conditions, v, path),
  };
  return { ids, errors };
}

// Données de création, y compris les tables liées (aussi pour une modification :
// les lignes liées sont supprimées puis recréées)
function monsterData(input: HomebrewMonsterInput, ids: Awaited<ReturnType<typeof resolveReferences>>['ids'], lang: string) {
  const { hitDice, abilityScores: s } = input;
  const average = Math.max(1, Math.floor(hitDice.count * (hitDice.size + 1) / 2) + hitDice.bonus);
  let position = 0;
  const action = (kind: Prisma.MonsterActionCreateWithoutMonsterInput['kind'], path: string) => (a: HomebrewAction, i: number) => ({
    kind,
    position: position++,
    attackType: a.attack?.type ?? null,
    attackBonus: a.attack?.bonus ?? null,
    reachFt: a.attack?.reachFt ?? null,
    normalRangeFt: a.attack?.rangeFt?.normal ?? null,
    longRangeFt: a.attack?.rangeFt?.long ?? null,
    saveAbilityId: a.save ? ids.ability(a.save.ability, `${path}[${i}].save.ability`) : null,
    saveDc: a.save?.dc ?? null,
    legendaryCost: kind === 'LEGENDARY' ? a.legendaryCost ?? null : null,
    translations: { create: [{ localeCode: lang, name: a.name, description: a.description }] },
    damages: { create: a.damages.map((d, j) => ({ position: j, dice: d.dice, damageTypeId: ids.damageType(d.damageType, `${path}[${i}].damages[${j}].damageType`) })) },
  });
  const modifiers = (kind: 'VULNERABILITY' | 'RESISTANCE' | 'IMMUNITY', list: HomebrewMonsterInput['damageResistances'], path: string) =>
    list.map((d, i) => ({ kind, damageTypeId: ids.damageType(d.damageType, `${path}[${i}].damageType`), nonMagicalOnly: d.nonMagicalOnly }));
  const actions = [
    ...input.traits.map(action('TRAIT', 'traits')),
    ...input.actions.map(action('ACTION', 'actions')),
    ...input.bonusActions.map(action('BONUS_ACTION', 'bonusActions')),
    ...input.reactions.map(action('REACTION', 'reactions')),
    ...input.legendaryActions.map(action('LEGENDARY', 'legendaryActions')),
    ...input.lairActions.map(action('LAIR', 'lairActions')),
  ];
  return {
    scalars: {
      size: input.size,
      creatureTypeId: ids.creatureTypeId,
      isUnaligned: !input.alignment,
      hitPoints: input.hitPoints ?? average,
      hitDiceCount: hitDice.count,
      hitDieSize: hitDice.size,
      hitPointBonus: hitDice.bonus,
      speeds: input.speeds,
      strength: s.str, dexterity: s.dex, constitution: s.con, intelligence: s.int, wisdom: s.wis, charisma: s.cha,
      senses: input.senses,
      passivePerception: input.passivePerception ?? 10 + modifier(s.wis),
      challengeRating: input.challengeRating,
      xp: CR_XP[String(input.challengeRating)]!,
      legendaryActionsPerRound: input.legendaryActions.length ? input.legendaryActionsPerRound ?? 3 : null,
    },
    relations: {
      translations: { create: [{ localeCode: lang, name: input.name, description: input.description ?? null, languagesText: input.languages ?? null }] },
      alignments: { create: ids.alignmentId ? [{ alignmentId: ids.alignmentId }] : [] },
      armorClasses: {
        create: [{
          position: 0, value: input.armorClass.value, sourceType: 'NATURAL' as const,
          translations: { create: input.armorClass.note ? [{ localeCode: lang, note: input.armorClass.note }] : [] },
        }],
      },
      savingThrows: { create: input.savingThrows.map((t, i) => ({ abilityScoreId: ids.ability(t.ability, `savingThrows[${i}].ability`), bonus: t.bonus })) },
      skills: { create: input.skills.map((t, i) => ({ skillId: ids.skill(t.skill, `skills[${i}].skill`), bonus: t.bonus })) },
      damageModifiers: {
        create: [
          ...modifiers('VULNERABILITY', input.damageVulnerabilities, 'damageVulnerabilities'),
          ...modifiers('RESISTANCE', input.damageResistances, 'damageResistances'),
          ...modifiers('IMMUNITY', input.damageImmunities, 'damageImmunities'),
        ],
      },
      conditionImmunities: { create: input.conditionImmunities.map((c, i) => ({ conditionId: ids.condition(c, `conditionImmunities[${i}]`) })) },
      actions: { create: actions },
    },
  };
}

async function parseAndResolve(req: Request, res: Response) {
  const parsed = homebrewMonsterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid monster', errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return null;
  }
  const { ids, errors } = await resolveReferences(parsed.data);
  const lang = (await resolveLang(req)).lang;
  const data = monsterData(parsed.data, ids, lang);
  // Les recherches d'index se font pendant la construction : erreurs connues ensuite
  if (errors.length) {
    res.status(400).json({ message: 'Invalid monster', errors });
    return null;
  }
  return { data, editionId: ids.editionId, name: parsed.data.name };
}

// --- Lecture -----------------------------------------------------------------------------

export const getMyMonsters = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const rows = await prisma.monster.findMany({ where: mine(req), orderBy: { createdAt: 'desc' }, include: summaryInclude });
    res.json(rows.map((m) => monsterSummary(m, ctx)));
  } catch (error) {
    fail(res, 'fetching homebrew monsters', error);
  }
};

export const getMyMonster = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const m = await prisma.monster.findFirst({ where: { ...mine(req), index: String(req.params.index) }, include: detailInclude });
    if (!m) return res.status(404).json({ message: 'Monster not found' });
    res.json(monsterDetail(m, ctx));
  } catch (error) {
    fail(res, 'fetching homebrew monster', error);
  }
};

// Listes du formulaire : types de créature, alignements, caractéristiques,
// compétences, types de dégâts, états (traduits)
export const getMonsterOptions = async (req: Request, res: Response) => {
  try {
    const ctx = await resolveLang(req);
    const ref = (x: { index: string; translations: { localeCode: string; name: string }[] }) => ({ index: x.index, name: pick(x.translations, ctx).name });
    const [types, alignments, abilities, skills, damageTypes, conditions] = await Promise.all([
      prisma.creatureType.findMany({ ...named, orderBy: { index: 'asc' } }),
      prisma.alignment.findMany({ ...named, orderBy: { id: 'asc' } }),
      prisma.abilityScore.findMany({ ...named, orderBy: { position: 'asc' } }),
      prisma.skill.findMany({ select: { ...named.select, abilityScore: { select: { index: true } } }, orderBy: { index: 'asc' } }),
      prisma.damageType.findMany({ ...named, orderBy: { index: 'asc' } }),
      prisma.condition.findMany({ ...named, orderBy: { index: 'asc' } }),
    ]);
    res.set('Cache-Control', 'private, max-age=3600');
    res.json({
      creatureTypes: types.map(ref), alignments: alignments.map(ref), abilities: abilities.map(ref),
      // Compétences avec leur caractéristique (valeur affichée sans maîtrise)
      skills: skills.map((k) => ({ ...ref(k), ability: k.abilityScore.index })), damageTypes: damageTypes.map(ref), conditions: conditions.map(ref),
      challengeRatings: Object.keys(CR_XP).map(Number).sort((a, b) => a - b).map((cr) => ({ value: cr, xp: CR_XP[String(cr)] })),
    });
  } catch (error) {
    fail(res, 'fetching monster options', error);
  }
};

// --- Écriture ----------------------------------------------------------------------------

export const createMonster = async (req: Request, res: Response) => {
  try {
    const input = await parseAndResolve(req, res);
    if (!input) return;
    const m = await prisma.monster.create({
      data: { ...input.data.scalars, ...input.data.relations, editionId: input.editionId, index: slug(input.name), ...mine(req) },
      select: { index: true },
    });
    res.status(201).json({ index: m.index });
  } catch (error) {
    fail(res, 'creating monster', error);
  }
};

export const updateMonster = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.monster.findFirst({ where: { ...mine(req), index: String(req.params.index) }, select: { id: true, index: true } });
    if (!existing) return res.status(404).json({ message: 'Monster not found' });
    const input = await parseAndResolve(req, res);
    if (!input) return;
    // Même id : les rencontres qui l'utilisent restent liées
    const where = { monsterId: existing.id };
    await prisma.$transaction([
      prisma.monsterTranslation.deleteMany({ where }),
      prisma.monsterAlignment.deleteMany({ where }),
      prisma.monsterArmorClass.deleteMany({ where }),
      prisma.monsterSavingThrow.deleteMany({ where }),
      prisma.monsterSkill.deleteMany({ where }),
      prisma.monsterDamageModifier.deleteMany({ where }),
      prisma.monsterConditionImmunity.deleteMany({ where }),
      prisma.monsterAction.deleteMany({ where }),
      prisma.monster.update({ where: { id: existing.id }, data: { ...input.data.scalars, ...input.data.relations } }),
    ]);
    res.json({ index: existing.index });
  } catch (error) {
    fail(res, 'updating monster', error);
  }
};

export const deleteMonster = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.monster.findFirst({
      where: { ...mine(req), index: String(req.params.index) },
      select: { id: true, _count: { select: { encounterMonsters: true } } },
    });
    if (!existing) return res.status(404).json({ message: 'Monster not found' });
    if (existing._count.encounterMonsters) return res.status(409).json({ message: 'This monster is used in an encounter' });
    await prisma.monster.delete({ where: { id: existing.id } });
    res.json({ message: 'Monster deleted' });
  } catch (error) {
    fail(res, 'deleting monster', error);
  }
};
