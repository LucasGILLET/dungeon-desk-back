// Configuration versionnée de l'interface Directus : `npm run directus:config`
//
// Ne touche qu'à la présentation (menus, libellés, formulaires) et aux rôles :
// la structure des tables reste gérée par les migrations Prisma. Le script lit
// le schéma Prisma (DMMF) pour configurer chaque table et chaque champ ; il est
// idempotent et peut être relancé après chaque migration.
import { Prisma } from '@prisma/client';
import { api, exists, fr, Json, upsertAlias } from './client';
import { COLLECTIONS, COMMON_FIELDS, ENUMS, FIELDS, MENU } from './labels';
import { configureRoles } from './roles';

type Model = Prisma.DMMF.Model;
type Field = Prisma.DMMF.Field;

const { models, enums } = Prisma.dmmf.datamodel;
const byName = new Map(models.map((m) => [m.name, m]));
const enumValues = new Map(enums.map((e) => [e.name, e.values.map((v) => v.name)]));

// Tables applicatives : visibles, mais hors des données de jeu (ni rôles ni formulaires soignés)
export const APP_MODELS = new Set(['User', 'Character', 'Npc']);
export const srdModels = models.filter((m) => !APP_MODELS.has(m.name));
export const isTranslation = (m: Model) => m.name.endsWith('Translation') && byName.has(m.name.slice(0, -'Translation'.length));

const LABEL_FIELDS = ['name', 'label', 'title', 'text', 'description'];

// Colonnes JSONB qui contiennent une liste de valeurs d'enum : cases à cocher
const JSON_ENUM_LISTS: Record<string, string> = { 'Race.sizes': 'Size' };

function label(model: string, field: string): string | undefined {
  return FIELDS[`${model}.${field}`] ?? COMMON_FIELDS[field];
}

// Champ de la traduction qui sert de titre (name, label, title…)
function translationLabelField(model: string): string | undefined {
  const t = byName.get(`${model}Translation`);
  return t && LABEL_FIELDS.find((f) => t.fields.some((x) => x.name === f));
}

function displayTemplate(m: Model): string | null {
  const tf = translationLabelField(m.name);
  const hasIndex = m.fields.some((f) => f.name === 'index');
  if (tf) return hasIndex ? `{{translations.${tf}}} ({{index}})` : `{{translations.${tf}}}`;
  if (m.name === 'Locale') return '{{name}}';
  if (m.name === 'Edition') return '{{code}}';
  if (m.name === 'ClassLevel') return 'Niveau {{level}}';
  // Statistiques 1-1 d'un objet : affichées par le nom de l'objet
  if (['WeaponStats', 'ArmorStats', 'VehicleStats'].includes(m.name)) return '{{equipmentId.translations.name}} ({{equipmentId.index}})';
  if (hasIndex) return '{{index}}';
  return null;
}

// --- Réglages et menu -----------------------------------------------------------

async function configureSettings(): Promise<void> {
  await api('PATCH', '/settings', { project_name: 'Dungeon Desk', project_descriptor: 'Données de jeu', default_language: 'fr-FR' });
}

async function configureMenu(): Promise<void> {
  const placed = new Map<string, { group: string; sort: number }>();
  for (const [i, { folder, label: name, icon, collections }] of MENU.entries()) {
    if (!(await exists(`/collections/${folder}`))) {
      await api('POST', '/collections', { collection: folder, meta: { icon }, schema: null });
    }
    await api('PATCH', `/collections/${folder}`, { meta: { icon, sort: i + 1, collapse: 'open', translations: [{ language: 'fr-FR', translation: name }] } });
    collections.forEach((c, j) => placed.set(c, { group: folder, sort: j + 1 }));
  }
  for (const m of models) {
    const place = placed.get(m.name);
    const names = COLLECTIONS[m.name];
    await api('PATCH', `/collections/${m.name}`, {
      meta: {
        // Une instance sans licence désactive les collections au-delà de la limite
        // de l'offre gratuite : on les réactive explicitement.
        status: 'active',
        group: place?.group ?? null,
        sort: place?.sort ?? null,
        hidden: !place,
        display_template: displayTemplate(m),
        translations: names ? [{ language: 'fr-FR', translation: names[1], singular: names[0], plural: names[1] }] : null,
      },
    });
  }
}

// --- Champs (générique, déduit du schéma Prisma) -----------------------------------

function fieldMeta(m: Model, f: Field): Json | null {
  if (f.kind === 'object') return null; // relations Prisma : pas de colonne en base
  const name = label(m.name, f.name);
  const meta: Json = {
    translations: name ? fr(name) : null,
    required: f.isRequired && !f.hasDefaultValue && !f.isId && !f.isUpdatedAt,
    hidden: false,
    readonly: false,
    width: 'full',
    interface: null,
    options: null,
    display: null,
    display_options: null,
  };
  const relation = m.fields.find((r) => r.kind === 'object' && r.relationFromFields?.includes(f.name));
  const parentOfTranslation = isTranslation(m) && relation?.type === m.name.slice(0, -'Translation'.length);

  if (f.isId && f.type === 'Int') Object.assign(meta, { hidden: true, readonly: true });
  else if (f.name === 'createdAt' || f.name === 'updatedAt') Object.assign(meta, { hidden: true, readonly: true });
  else if (f.name === 'ownerId') Object.assign(meta, { hidden: true });
  else if (parentOfTranslation || (isTranslation(m) && f.name === 'localeCode')) Object.assign(meta, { hidden: true });
  else if (relation) {
    const target = byName.get(relation.type)!;
    Object.assign(meta, {
      interface: 'select-dropdown-m2o',
      options: { template: displayTemplate(target) },
      display: 'related-values',
      display_options: { template: displayTemplate(target) },
      width: 'half',
    });
  } else if (f.kind === 'enum') {
    const labels = ENUMS[f.type] ?? {};
    const choices = (enumValues.get(f.type) ?? []).map((value) => ({ text: labels[value] ?? value, value }));
    Object.assign(meta, { interface: 'select-dropdown', options: { choices }, display: 'labels', display_options: { choices }, width: 'half' });
  } else if (JSON_ENUM_LISTS[`${m.name}.${f.name}`]) {
    const type = JSON_ENUM_LISTS[`${m.name}.${f.name}`];
    const labels = ENUMS[type] ?? {};
    const choices = (enumValues.get(type) ?? []).map((value) => ({ text: labels[value] ?? value, value }));
    Object.assign(meta, { interface: 'select-multiple-checkbox', options: { choices }, display: 'labels', display_options: { choices }, width: 'half' });
  } else if (f.type === 'Json') {
    Object.assign(meta, { interface: 'input-code', options: { language: 'JSON', lineNumber: false } });
  } else if (f.nativeType?.[0] === 'Text') {
    Object.assign(meta, { interface: 'input-rich-text-md', options: { toolbar: ['bold', 'italic', 'bullist', 'numlist', 'table'] } });
  } else if (f.type === 'Boolean') {
    Object.assign(meta, { interface: 'boolean', display: 'boolean', width: 'half' });
  } else if (f.type === 'Int' || f.type === 'Decimal') {
    Object.assign(meta, { interface: 'input', width: 'half' });
  } else if (f.type === 'String' && f.name !== 'index') {
    // Texte court (colonne text sans @db.Text) : une ligne, pas une zone multiligne
    Object.assign(meta, { interface: 'input', width: /Dice$|^key$|^code$/.test(f.name) ? 'half' : 'full' });
  } else if (f.name === 'index') {
    Object.assign(meta, { interface: 'input', options: { slug: true, font: 'monospace' }, width: 'half', note: 'Clé stable en anglais, utilisée par le code et les URL' });
  }
  return meta;
}

async function configureFields(): Promise<number> {
  let count = 0;
  for (const m of models) {
    for (const [sort, f] of m.fields.entries()) {
      const meta = fieldMeta(m, f);
      if (!meta) continue;
      await api('PATCH', `/fields/${m.name}/${f.name}`, { meta: { ...meta, sort: sort + 1 } });
      count++;
    }
  }
  return count;
}

// Onglet de traductions sur chaque entité qui a une table <Entité>Translation
async function configureTranslations(): Promise<number> {
  let count = 0;
  for (const m of models.filter(isTranslation)) {
    const parent = m.name.slice(0, -'Translation'.length);
    const fk = m.fields.find((f) => f.kind === 'object' && f.type === parent)!.relationFromFields![0];
    await api('PATCH', `/relations/${m.name}/${fk}`, { meta: { one_field: 'translations', junction_field: 'localeCode', one_deselect_action: 'delete' } });
    await api('PATCH', `/relations/${m.name}/localeCode`, { meta: { junction_field: fk } });
    const tf = translationLabelField(parent);
    await upsertAlias(parent, 'translations', {
      special: ['translations'],
      interface: 'translations',
      options: { languageField: 'name', defaultLanguage: 'fr', userLanguage: false, defaultOpenSplitView: true },
      display: 'translations',
      display_options: { template: tf ? `{{${tf}}}` : null, languageField: 'name', defaultLanguage: 'fr', userLanguage: false },
      translations: fr('Traductions'),
      sort: 3,
    });
    count++;
  }
  return count;
}

// --- Listes liées (générique, déduit du schéma Prisma) -------------------------------

// Pour chaque relation 1-n du schéma (champ liste Prisma), une liste liée dans la
// fiche du parent : capacités d'une sous-classe, options d'un choix, objets d'une
// catégorie… Les formulaires soignés ci-dessous remplacent ensuite certaines de
// ces listes par des relations n-n (sorts d'une classe, propriétés d'une arme…).
async function configureRelations(): Promise<number> {
  let count = 0;
  // Tables pivots référencées par presque tout (langues, éditions) : pas de listes
  const HUBS = new Set(['Locale', 'Edition']);
  for (const parent of models) {
    if (isTranslation(parent) || HUBS.has(parent.name)) continue;
    for (const field of parent.fields) {
      if (field.kind !== 'object' || !field.isList) continue;
      const child = byName.get(field.type)!;
      if (isTranslation(child)) continue; // les traductions passent par l'onglet de traductions
      const back = child.fields.find((f) => f.relationName === field.relationName && f.relationFromFields?.length);
      if (!back) continue;
      const template = displayTemplate(child) ?? '{{id}}';
      await api('PATCH', `/relations/${child.name}/${back.relationFromFields![0]}`, { meta: { one_field: field.name } });
      await upsertAlias(parent.name, field.name, {
        special: ['o2m'], interface: 'list-o2m', options: { template, enableLink: true },
        display: 'related-values', display_options: { template },
        translations: label(parent.name, field.name) ? fr(label(parent.name, field.name)!) : null,
      });
      count++;
    }
  }
  return count;
}

// --- Formulaires soignés : classes et sorts -----------------------------------------

async function o2m(parent: string, alias: string, child: string, fk: string, template: string): Promise<void> {
  await api('PATCH', `/relations/${child}/${fk}`, { meta: { one_field: alias } });
  await upsertAlias(parent, alias, {
    special: ['o2m'], interface: 'list-o2m', options: { template, enableLink: true },
    display: 'related-values', display_options: { template }, translations: fr(label(parent, alias) ?? alias),
  });
}

async function m2m(parent: string, alias: string, junction: string, fkParent: string, fkOther: string, template: string, otherAlias: string | null = null): Promise<void> {
  await api('PATCH', `/relations/${junction}/${fkParent}`, { meta: { one_field: alias, junction_field: fkOther } });
  await api('PATCH', `/relations/${junction}/${fkOther}`, { meta: { one_field: otherAlias, junction_field: fkParent } });
  await upsertAlias(parent, alias, {
    special: ['m2m'], interface: 'list-m2m', options: { template, enableLink: true },
    display: 'related-values', display_options: { template }, translations: fr(label(parent, alias) ?? alias),
  });
}

// Groupes repliables : chaque groupe est un champ alias ; ses membres pointent vers lui
async function groups(collection: string, layout: [string, string, string[]][]): Promise<void> {
  let sort = 10;
  for (const [key, title, members] of layout) {
    await upsertAlias(collection, key, {
      special: ['alias', 'no-data', 'group'], interface: 'group-detail', options: { start: 'open' },
      translations: fr(title), sort: sort++, width: 'full',
    });
    for (const [i, field] of members.entries()) {
      await api('PATCH', `/fields/${collection}/${field}`, { meta: { group: key, sort: i + 1 } });
    }
  }
}

async function configureClassForms(): Promise<void> {
  const tpl = (m: string) => displayTemplate(byName.get(m)!)!;
  await o2m('Class', 'levels', 'ClassLevel', 'classId', 'Niveau {{level}}');
  await o2m('Class', 'tableColumns', 'ClassTableColumn', 'classId', '{{translations.label}} ({{key}})');
  await o2m('Class', 'features', 'ClassFeature', 'classId', 'Niv. {{level}} · {{translations.name}}');
  await o2m('Class', 'subclasses', 'Subclass', 'classId', tpl('Subclass'));
  await o2m('Class', 'choices', 'Choice', 'classId', '{{kind}} · choisir {{choose}}');
  await o2m('Class', 'spellcasting', 'ClassSpellcasting', 'classId', '{{casterType}} dès le niveau {{startLevel}}');
  await o2m('Class', 'multiclassRequirements', 'MulticlassRequirement', 'classId', '{{abilityScoreId.translations.abbreviation}} {{minimumScore}}');
  await o2m('ClassLevel', 'spellSlots', 'ClassLevelSpellSlot', 'classLevelId', 'Niv. {{spellLevel}} : {{slots}}');
  await m2m('Class', 'savingThrows', 'ClassSavingThrow', 'classId', 'abilityScoreId', '{{abilityScoreId.translations.name}}');
  await m2m('Class', 'primaryAbilities', 'ClassPrimaryAbility', 'classId', 'abilityScoreId', '{{abilityScoreId.translations.name}}');
  await m2m('Class', 'proficiencies', 'ClassProficiency', 'classId', 'proficiencyId', '{{proficiencyId.translations.name}}');
  await m2m('Class', 'multiclassProficiencies', 'ClassMulticlassProficiency', 'classId', 'proficiencyId', '{{proficiencyId.translations.name}}');
  await m2m('Class', 'startingEquipment', 'ClassStartingEquipment', 'classId', 'equipmentId', '{{quantity}} × {{equipmentId.translations.name}}');
  await m2m('Class', 'spells', 'ClassSpell', 'classId', 'spellId', '{{spellId.translations.name}} (niv. {{spellId.level}})', 'classes');

  await groups('Class', [
    ['grp_general', 'Général', ['index', 'editionId', 'hitDie', 'subclassLevel', 'source']],
    ['grp_maitrises', 'Maîtrises et équipement', ['primaryAbilities', 'savingThrows', 'proficiencies', 'startingEquipment', 'choices']],
    ['grp_progression', 'Progression', ['levels', 'tableColumns']],
    ['grp_capacites', 'Capacités et sous-classes', ['features', 'subclasses']],
    ['grp_incantation', 'Incantation', ['spellcasting', 'spells']],
    ['grp_multiclassage', 'Multiclassage', ['multiclassRequirements', 'multiclassProficiencies']],
  ]);
}

async function configureSpellForms(): Promise<void> {
  await m2m('Spell', 'damageTypes', 'SpellDamageType', 'spellId', 'damageTypeId', '{{damageTypeId.translations.name}}');
  await m2m('Spell', 'classes', 'ClassSpell', 'spellId', 'classId', '{{classId.translations.name}}', 'spells');

  await groups('Spell', [
    ['grp_general', 'Général', ['index', 'editionId', 'level', 'schoolId', 'source']],
    ['grp_incantation', 'Incantation', ['castingTimeAmount', 'castingTimeUnit', 'ritual', 'concentration']],
    ['grp_portee', 'Portée, durée et zone', ['rangeType', 'rangeFt', 'durationType', 'durationAmount', 'areaType', 'areaSizeFt']],
    ['grp_composantes', 'Composantes', ['verbal', 'somatic', 'material', 'materialCostGp', 'materialConsumed']],
    ['grp_effet', 'Effet', ['attackType', 'saveAbilityId', 'saveSuccess', 'damageTypes', 'damageScaling', 'healingScaling']],
    ['grp_listes', 'Listes de sorts', ['classes']],
  ]);
  // Distances et quantités : visibles seulement quand elles ont un sens
  const when = (field: string, values: string[]) => [{ name: 'Masqué', rule: { _and: [{ [field]: { _nin: values } }] }, hidden: true }];
  await api('PATCH', '/fields/Spell/rangeFt', { meta: { conditions: when('rangeType', ['DISTANCE']) } });
  await api('PATCH', '/fields/Spell/durationAmount', { meta: { conditions: when('durationType', ['ROUND', 'MINUTE', 'HOUR', 'DAY']) } });
  await api('PATCH', '/fields/Spell/areaSizeFt', { meta: { conditions: [{ name: 'Masqué', rule: { _and: [{ areaType: { _null: true } }] }, hidden: true }] } });
  await api('PATCH', '/fields/Spell/materialCostGp', { meta: { conditions: [{ name: 'Masqué', rule: { _and: [{ material: { _eq: false } }] }, hidden: true }] } });
  await api('PATCH', '/fields/Spell/materialConsumed', { meta: { conditions: [{ name: 'Masqué', rule: { _and: [{ material: { _eq: false } }] }, hidden: true }] } });
}

async function configureRaceForms(): Promise<void> {
  const tpl = (m: string) => displayTemplate(byName.get(m)!)!;
  await o2m('Race', 'subraces', 'Subrace', 'raceId', tpl('Subrace'));
  await o2m('Race', 'abilityBonus', 'RaceAbilityBonus', 'raceId', '{{abilityScoreId.translations.abbreviation}} +{{bonus}}');
  await o2m('Race', 'choices', 'Choice', 'raceId', '{{kind}} · choisir {{choose}}');
  await m2m('Race', 'traits', 'RaceTrait', 'raceId', 'traitId', '{{traitId.translations.name}}');
  await m2m('Race', 'languages', 'RaceLanguage', 'raceId', 'languageId', '{{languageId.translations.name}}');
  await o2m('Subrace', 'abilityBonus', 'SubraceAbilityBonus', 'subraceId', '{{abilityScoreId.translations.abbreviation}} +{{bonus}}');
  await m2m('Subrace', 'traits', 'SubraceTrait', 'subraceId', 'traitId', '{{traitId.translations.name}}');
  await m2m('Trait', 'proficiencies', 'TraitProficiency', 'traitId', 'proficiencyId', '{{proficiencyId.translations.name}}');
  await groups('Race', [
    ['grp_general', 'Général', ['index', 'editionId', 'sizes', 'speeds', 'source']],
    ['grp_bonus', 'Bonus et langues', ['abilityBonus', 'languages', 'choices']],
    ['grp_traits', 'Traits et sous-races', ['traits', 'subraces']],
  ]);
}

async function configureBackgroundForms(): Promise<void> {
  await m2m('Background', 'proficiencies', 'BackgroundProficiency', 'backgroundId', 'proficiencyId', '{{proficiencyId.translations.name}}');
  await m2m('Background', 'startingEquipment', 'BackgroundStartingEquipment', 'backgroundId', 'equipmentId', '{{quantity}} × {{equipmentId.translations.name}}');
  await o2m('Background', 'personalityOptions', 'BackgroundPersonalityOption', 'backgroundId', '{{kind}} {{position}} · {{translations.text}}');
  await o2m('Background', 'choices', 'Choice', 'backgroundId', '{{kind}} · choisir {{choose}}');
  await o2m('Feat', 'prerequisites', 'FeatPrerequisite', 'featId', '{{abilityScoreId.translations.abbreviation}} {{minimumScore}}');
  await groups('Background', [
    ['grp_general', 'Général', ['index', 'editionId', 'source']],
    ['grp_dotations', 'Maîtrises et équipement', ['proficiencies', 'startingEquipment', 'choices']],
    ['grp_personnalite', 'Personnalité', ['personalityOptions']],
  ]);
}

// Champ visible seulement pour certains types d'objet (kind)
const onlyForKinds = (kinds: string[]) => [{ name: 'Masqué', rule: { _and: [{ kind: { _nin: kinds } }] }, hidden: true }];

async function configureEquipmentForms(): Promise<void> {
  // Statistiques 1-1 : la clé primaire de WeaponStats est l'id de l'objet
  await o2m('Equipment', 'weapon', 'WeaponStats', 'equipmentId', '{{category}} · {{range}} · {{damageDice}} {{damageTypeId.translations.name}}');
  await o2m('Equipment', 'armor', 'ArmorStats', 'equipmentId', '{{category}} · CA {{baseArmorClass}}');
  await o2m('Equipment', 'vehicle', 'VehicleStats', 'equipmentId', '{{speed}} {{speedUnit}}');
  await m2m('Equipment', 'categories', 'EquipmentCategoryItem', 'equipmentId', 'categoryId', '{{categoryId.translations.name}}', 'items');
  await m2m('EquipmentCategory', 'items', 'EquipmentCategoryItem', 'categoryId', 'equipmentId', '{{equipmentId.translations.name}}', 'categories');
  await o2m('Equipment', 'packContents', 'PackContent', 'packId', '{{quantity}} × {{itemId.translations.name}}');
  await m2m('WeaponStats', 'properties', 'WeaponStatsProperty', 'weaponId', 'propertyId', '{{propertyId.translations.name}}');
  await groups('Equipment', [
    ['grp_general', 'Général', ['index', 'editionId', 'kind', 'source', 'categories']],
    ['grp_prix', 'Prix et poids', ['costAmount', 'costCurrency', 'weightLb', 'bundleSize']],
    ['grp_stats', 'Statistiques', ['weapon', 'armor', 'vehicle', 'packContents']],
  ]);
  await api('PATCH', '/fields/Equipment/weapon', { meta: { conditions: onlyForKinds(['WEAPON']) } });
  await api('PATCH', '/fields/Equipment/armor', { meta: { conditions: onlyForKinds(['ARMOR']) } });
  await api('PATCH', '/fields/Equipment/vehicle', { meta: { conditions: onlyForKinds(['MOUNT', 'VEHICLE']) } });
  await api('PATCH', '/fields/Equipment/packContents', { meta: { conditions: onlyForKinds(['PACK']) } });
  await api('PATCH', '/fields/WeaponStats/versatileDice', { meta: { note: 'Seulement pour les armes polyvalentes' } });
}

async function main(): Promise<void> {
  const started = Date.now();
  await configureSettings();
  await configureMenu();
  const fields = await configureFields();
  const translations = await configureTranslations();
  const relations = await configureRelations();
  await configureClassForms();
  await configureSpellForms();
  await configureEquipmentForms();
  await configureRaceForms();
  await configureBackgroundForms();
  const roles = await configureRoles(srdModels.map((m) => m.name), srdModels.filter(isTranslation).map((m) => m.name));
  console.log(`[directus] ${models.length} collections, ${fields} champs, ${translations} onglets de traduction, ${relations} listes liées, ${roles} ; ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main().catch((error) => {
  console.error('[directus] échec :', error.message);
  process.exit(1);
});
