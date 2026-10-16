// Équipement : catégories (hiérarchie déduite), objets, statistiques d'arme,
// d'armure et de véhicule, propriétés d'arme, contenu des paquetages ; puis
// maîtrises, qui pointent vers l'équipement.
import {
  ArmorCategory, Currency, EquipmentKind, PrismaClient, ProficiencyType, VehicleSpeedUnit, WeaponCategory, WeaponRange,
} from '@prisma/client';
import { DiceSchema } from '../../srd/jsonb';
import { Json, loadSrd, log, parseUrl, Refs, replaceTranslations, text, translationsFor, TX_OPTIONS } from '../context';

const FOCUS_CATEGORIES = new Set(['arcane-foci', 'druidic-foci', 'holy-symbols']);

function kindOf(e: Json): EquipmentKind {
  switch (e.equipment_category.index) {
    case 'weapon': return 'WEAPON';
    case 'armor': return 'ARMOR';
    case 'tools': return 'TOOL';
    case 'mounts-and-vehicles': return e.vehicle_category === 'Mounts and Other Animals' ? 'MOUNT' : 'VEHICLE';
    default: {
      const gear = e.gear_category?.index;
      if (gear === 'ammunition') return 'AMMUNITION';
      if (gear === 'equipment-packs') return 'PACK';
      if (FOCUS_CATEGORIES.has(gear)) return 'FOCUS';
      return 'ADVENTURING_GEAR';
    }
  }
}

function description(row: Json): string | null {
  return text([...(row.desc ?? []), ...(row.special ?? [])]);
}

export async function importEquipment(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const key = (index: string) => ({ editionId_index: { editionId, index } });

  // --- Propriétés d'arme ---
  const properties = loadSrd(edition, 'Weapon-Properties');
  for (const en of properties.list) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.weaponProperty.upsert({ where: key(en.index), create: { editionId, index: en.index }, update: {} });
      await replaceTranslations(tx, 'weaponPropertyTranslation', 'weaponPropertyId', row.id,
        translationsFor(properties, en.index, (r) => ({ name: r.name, description: text(r.desc) ?? '' })));
    }, TX_OPTIONS);
  }
  refs.reset('weaponProperty');

  // --- Catégories : la hiérarchie n'est pas dans le SRD, on la déduit des contenus
  // (le parent est la plus petite catégorie qui contient strictement celle-ci) ---
  const categories = loadSrd(edition, 'Equipment-Categories');
  const contents = new Map<string, Set<string>>(
    categories.list.map((c: Json) => [
      c.index,
      new Set<string>(c.equipment.filter((e: Json) => parseUrl(e.url)[0] === 'equipment').map((e: Json) => e.index)),
    ]),
  );
  const parentOf = (index: string): string | null => {
    const own = contents.get(index)!;
    if (!own.size) return null;
    let best: string | null = null;
    for (const [other, set] of contents) {
      if (other === index || set.size <= own.size || ![...own].every((e) => set.has(e))) continue;
      if (!best || set.size < contents.get(best)!.size) best = other;
    }
    return best;
  };
  const categoryIds = new Map<string, number>();
  for (const en of categories.list) {
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.equipmentCategory.upsert({ where: key(en.index), create: { editionId, index: en.index }, update: {} });
      await replaceTranslations(tx, 'equipmentCategoryTranslation', 'equipmentCategoryId', row.id,
        translationsFor(categories, en.index, (r) => ({ name: r.name })));
      return row.id;
    }, TX_OPTIONS);
    categoryIds.set(en.index, id);
  }
  for (const en of categories.list) {
    const parent = parentOf(en.index);
    await prisma.equipmentCategory.update({ where: { id: categoryIds.get(en.index)! }, data: { parentId: parent ? categoryIds.get(parent)! : null } });
  }

  // --- Objets ---
  await refs.preload('damageType', 'weaponProperty');
  const equipment = loadSrd(edition, 'Equipment');
  const equipmentIds = new Map<string, number>();
  for (const en of equipment.list) {
    const data = {
      kind: kindOf(en),
      costAmount: en.cost?.quantity ?? null,
      costCurrency: en.cost ? (en.cost.unit.toUpperCase() as Currency) : null,
      weightLb: en.weight ?? null,
      bundleSize: en.quantity ?? 1,
    };
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.equipment.upsert({ where: key(en.index), create: { editionId, index: en.index, ...data }, update: data });
      await replaceTranslations(tx, 'equipmentTranslation', 'equipmentId', row.id,
        translationsFor(equipment, en.index, (r) => ({ name: r.name, description: description(r) })));

      await tx.weaponStats.deleteMany({ where: { equipmentId: row.id } });
      await tx.armorStats.deleteMany({ where: { equipmentId: row.id } });
      await tx.vehicleStats.deleteMany({ where: { equipmentId: row.id } });

      if (en.weapon_category) {
        const ranged = en.weapon_range === 'Ranged';
        const range = ranged ? en.range : en.throw_range;
        for (const dice of [en.damage?.damage_dice, en.two_handed_damage?.damage_dice]) {
          if (dice) DiceSchema.parse(dice.replace(/\s/g, ''));
        }
        await tx.weaponStats.create({
          data: {
            equipmentId: row.id,
            category: en.weapon_category.toUpperCase() as WeaponCategory,
            range: en.weapon_range.toUpperCase() as WeaponRange,
            damageDice: en.damage?.damage_dice ?? null,
            damageTypeId: en.damage ? await refs.id('damageType', en.damage.damage_type.index) : null,
            versatileDice: en.two_handed_damage?.damage_dice ?? null,
            normalRangeFt: range?.normal ?? null,
            longRangeFt: range?.long ?? null,
            properties: {
              create: await Promise.all(
                (en.properties ?? []).map(async (p: Json) => ({ propertyId: await refs.id('weaponProperty', p.index) })),
              ),
            },
          },
        });
      }
      if (en.armor_category) {
        await tx.armorStats.create({
          data: {
            equipmentId: row.id,
            category: en.armor_category.toUpperCase() as ArmorCategory,
            baseArmorClass: en.armor_class.base,
            addsDexModifier: en.armor_class.dex_bonus,
            maxDexModifier: en.armor_class.max_bonus ?? null,
            strengthMinimum: en.str_minimum || null,
            stealthDisadvantage: en.stealth_disadvantage ?? false,
          },
        });
      }
      if (en.speed || en.capacity) {
        await tx.vehicleStats.create({
          data: {
            equipmentId: row.id,
            speed: en.speed?.quantity ?? null,
            speedUnit: en.speed ? (en.speed.unit === 'mph' ? VehicleSpeedUnit.MILES_PER_HOUR : VehicleSpeedUnit.FEET_PER_ROUND) : null,
            capacityLb: en.capacity ? Number(en.capacity.replace(/[^\d]/g, '')) : null,
          },
        });
      }
      return row.id;
    }, TX_OPTIONS);
    equipmentIds.set(en.index, id);
  }

  // Appartenance aux catégories et contenu des paquetages (une fois tous les objets créés)
  await prisma.$transaction(async (tx) => {
    await tx.equipmentCategoryItem.deleteMany({ where: { equipment: { editionId } } });
    await tx.equipmentCategoryItem.createMany({
      data: [...contents].flatMap(([category, items]) =>
        [...items].filter((e) => equipmentIds.has(e)).map((e) => ({ equipmentId: equipmentIds.get(e)!, categoryId: categoryIds.get(category)! }))),
    });
    await tx.packContent.deleteMany({ where: { pack: { editionId } } });
    await tx.packContent.createMany({
      data: equipment.list.flatMap((en: Json) =>
        (en.contents ?? []).map((c: Json) => ({ packId: equipmentIds.get(en.index)!, itemId: equipmentIds.get(c.item.index)!, quantity: c.quantity }))),
    });
  }, TX_OPTIONS);
  refs.reset();

  log(`équipement : ${equipment.list.length} objets, ${categories.list.length} catégories, ${properties.list.length} propriétés d'arme`);
}

// --- Maîtrises -----------------------------------------------------------------

const PROFICIENCY_TYPES: Record<string, ProficiencyType> = {
  Skills: 'SKILL',
  'Saving Throws': 'SAVING_THROW',
  Armor: 'ARMOR',
  Weapons: 'WEAPON',
  "Artisan's Tools": 'ARTISAN_TOOL',
  'Musical Instruments': 'MUSICAL_INSTRUMENT',
  'Gaming Sets': 'GAMING_SET',
  Vehicles: 'VEHICLE',
  Other: 'OTHER',
};

const REFERENCE_FIELDS: Record<string, { model: string; field: string }> = {
  skills: { model: 'skill', field: 'skillId' },
  'ability-scores': { model: 'abilityScore', field: 'abilityScoreId' },
  equipment: { model: 'equipment', field: 'equipmentId' },
  'equipment-categories': { model: 'equipmentCategory', field: 'equipmentCategoryId' },
};

export async function importProficiencies(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const proficiencies = loadSrd(edition, 'Proficiencies');
  await refs.preload(...Object.values(REFERENCE_FIELDS).map((t) => t.model));
  for (const en of proficiencies.list) {
    const type = PROFICIENCY_TYPES[en.type];
    if (!type) throw new Error(`Type de maîtrise inconnu : ${en.type}`);
    const [kind, index] = parseUrl(en.reference.url);
    const target = REFERENCE_FIELDS[kind];
    if (!target) throw new Error(`Cible de maîtrise inconnue : ${en.reference.url}`);
    const data = {
      type,
      skillId: null, abilityScoreId: null, equipmentId: null, equipmentCategoryId: null,
      [target.field]: await refs.id(target.model, index),
    };
    await prisma.$transaction(async (tx) => {
      const row = await tx.proficiency.upsert({
        where: { editionId_index: { editionId, index: en.index } },
        create: { editionId, index: en.index, ...data },
        update: data,
      });
      await replaceTranslations(tx, 'proficiencyTranslation', 'proficiencyId', row.id,
        translationsFor(proficiencies, en.index, (r) => ({ name: r.name })));
    }, TX_OPTIONS);
  }
  refs.reset('proficiency');
  log(`maîtrises : ${proficiencies.list.length}`);
}
