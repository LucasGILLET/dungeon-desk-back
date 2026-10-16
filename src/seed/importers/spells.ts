// Sorts : les chaînes du SRD ("1 action", "90 feet", "Up to 1 minute") sont
// décomposées en colonnes neutres ; seul le texte reste en traduction.
import { AreaType, AttackType, CastingTimeUnit, Prisma, PrismaClient, SaveSuccess, SpellDurationType, SpellRangeType } from '@prisma/client';
import { DiceScalingSchema } from '../../srd/jsonb';
import { Json, loadSrd, log, Refs, replaceTranslations, text, translationsFor, TX_OPTIONS } from '../context';

const CASTING_UNITS: Record<string, CastingTimeUnit> = {
  action: 'ACTION', 'bonus action': 'BONUS_ACTION', reaction: 'REACTION', minute: 'MINUTE', hour: 'HOUR',
};

export function parseCastingTime(value: string): { castingTimeAmount: number; castingTimeUnit: CastingTimeUnit } {
  const m = /^(\d+) (action|bonus action|reaction|minute|hour)s?$/.exec(value);
  if (!m) throw new Error(`Temps d'incantation non reconnu : "${value}"`);
  return { castingTimeAmount: Number(m[1]), castingTimeUnit: CASTING_UNITS[m[2]] };
}

export function parseRange(value: string): { rangeType: SpellRangeType; rangeFt: number | null } {
  const fixed: Record<string, SpellRangeType> = { Self: 'SELF', Touch: 'TOUCH', Sight: 'SIGHT', Unlimited: 'UNLIMITED', Special: 'SPECIAL' };
  if (fixed[value]) return { rangeType: fixed[value], rangeFt: null };
  const m = /^(\d+) (feet|mile|miles)$/.exec(value);
  if (!m) throw new Error(`Portée non reconnue : "${value}"`);
  return { rangeType: 'DISTANCE', rangeFt: Number(m[1]) * (m[2] === 'feet' ? 1 : 5280) };
}

export function parseDuration(value: string): { durationType: SpellDurationType; durationAmount: number | null } {
  const fixed: Record<string, SpellDurationType> = { Instantaneous: 'INSTANTANEOUS', 'Until dispelled': 'UNTIL_DISPELLED', Special: 'SPECIAL' };
  if (fixed[value]) return { durationType: fixed[value], durationAmount: null };
  const m = /^(?:Up to )?(\d+) (round|minute|hour|day)s?$/.exec(value);
  if (!m) throw new Error(`Durée non reconnue : "${value}"`);
  return { durationType: m[2].toUpperCase() as SpellDurationType, durationAmount: Number(m[1]) };
}

// "worth at least 1,000 gp" → 1000 ; première valeur mentionnée
export function parseMaterialCost(material: string | undefined): number | null {
  const m = material ? /worth (?:at least )?([\d,]+) ?gp/.exec(material) : null;
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

function scaling(values: Record<string, string> | undefined, by: 'slot_level' | 'character_level') {
  if (!values) return null;
  const normalized = Object.fromEntries(Object.entries(values).map(([level, dice]) => [level, dice.replace(/\s/g, '')]));
  return DiceScalingSchema.parse({ by, values: normalized });
}

export async function importSpells(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const spells = loadSrd(edition, 'Spells');
  await refs.preload('magicSchool', 'abilityScore', 'damageType');
  for (const en of spells.list as Json[]) {
    const damage = en.damage ?? {};
    const data = {
      level: en.level,
      schoolId: await refs.id('magicSchool', en.school.index),
      ...parseCastingTime(en.casting_time),
      ritual: en.ritual,
      ...parseRange(en.range),
      verbal: en.components.includes('V'),
      somatic: en.components.includes('S'),
      material: en.components.includes('M'),
      materialCostGp: parseMaterialCost(en.material),
      materialConsumed: /consume/i.test(en.material ?? ''),
      ...parseDuration(en.duration),
      concentration: en.concentration,
      attackType: en.attack_type ? (en.attack_type.toUpperCase() as AttackType) : null,
      saveAbilityId: en.dc ? await refs.id('abilityScore', en.dc.dc_type.index) : null,
      saveSuccess: en.dc ? (en.dc.dc_success.toUpperCase() as SaveSuccess) : null,
      areaType: en.area_of_effect ? (en.area_of_effect.type.toUpperCase() as AreaType) : null,
      areaSizeFt: en.area_of_effect?.size ?? null,
      damageScaling: scaling(damage.damage_at_slot_level, 'slot_level') ?? scaling(damage.damage_at_character_level, 'character_level') ?? Prisma.DbNull,
      healingScaling: scaling(en.heal_at_slot_level, 'slot_level') ?? Prisma.DbNull,
    };
    await prisma.$transaction(async (tx) => {
      const row = await tx.spell.upsert({
        where: { editionId_index: { editionId, index: en.index } },
        create: { editionId, index: en.index, ...data },
        update: data,
      });
      await replaceTranslations(tx, 'spellTranslation', 'spellId', row.id,
        translationsFor(spells, en.index, (r) => ({
          name: r.name,
          description: text(r.desc) ?? '',
          higherLevels: text(r.higher_level),
          materialText: r.material ?? null,
        })));
      await tx.spellDamageType.deleteMany({ where: { spellId: row.id } });
      if (damage.damage_type) {
        await tx.spellDamageType.create({ data: { spellId: row.id, damageTypeId: await refs.id('damageType', damage.damage_type.index) } });
      }
    }, TX_OPTIONS);
  }
  refs.reset('spell');
  log(`sorts : ${spells.list.length}`);
}
