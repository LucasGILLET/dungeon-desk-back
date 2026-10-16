// Classes : classe, table de progression, incantation, multiclassage, choix,
// sous-classes et capacités. Une transaction par classe.
import { CasterType, ChoiceKind, ClassColumnValueType, ClassFeaturePrerequisiteType, PrismaClient } from '@prisma/client';
import { Json, LOCALES, LocaleCode, loadSrd, log, readJson, Refs, replaceTranslations, SrdFile, text, translationsFor, TX_OPTIONS, Tx } from '../context';
import { ChoiceImporter } from './choices';

const CASTER_TYPES: Record<string, CasterType> = {
  bard: 'FULL', cleric: 'FULL', druid: 'FULL', sorcerer: 'FULL', wizard: 'FULL',
  paladin: 'HALF', ranger: 'HALF',
  warlock: 'PACT',
};

interface Sources {
  classes: SrdFile;
  levels: SrdFile;
  subclasses: SrdFile;
  features: SrdFile;
  spells: SrdFile;
  labels: Json;
}

// Équivalents localisés d'une valeur, par langue (même chemin dans chaque fichier)
function localized(file: SrdFile, index: string, pick: (row: Json) => Json): Partial<Record<LocaleCode, Json>> {
  return Object.fromEntries(LOCALES.filter((l) => l !== 'en').map((l) => [l, (() => {
    const row = file.get(l, index);
    return row ? pick(row) : undefined;
  })()]));
}

function columnType(value: unknown): ClassColumnValueType | null {
  if (typeof value === 'number') return 'INTEGER';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (value && typeof value === 'object' && 'dice_count' in value) return 'DICE';
  return null; // listes (conversion des points de sorcellerie) : non modélisées en colonne
}

function columnValue(value: Json): Record<string, unknown> {
  if (typeof value === 'number') return { intValue: value };
  if (typeof value === 'boolean') return { boolValue: value };
  return { diceCount: value.dice_count, diceValue: value.dice_value };
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export class ClassImporter {
  private choices: ChoiceImporter;
  private src: Sources;

  constructor(private prisma: PrismaClient, private refs: Refs, edition: string) {
    this.choices = new ChoiceImporter(refs);
    this.src = {
      classes: loadSrd(edition, 'Classes'),
      levels: loadSrd(edition, 'Levels'),
      subclasses: loadSrd(edition, 'Subclasses'),
      features: loadSrd(edition, 'Features'),
      spells: loadSrd(edition, 'Spells'),
      labels: readJson(`${edition}/custom/class-labels.json`),
    };
  }

  get untranslatedChoices(): number {
    return this.choices.untranslated;
  }

  async importAll(only?: string[]): Promise<void> {
    const list = this.src.classes.list.filter((c: Json) => !only?.length || only.includes(c.index));
    if (only?.length && list.length !== only.length) throw new Error(`Classe inconnue parmi : ${only.join(', ')}`);
    await this.refs.preload(
      'abilityScore', 'proficiency', 'equipment', 'equipmentCategory', 'spell',
      'classFeature', 'creatureType', 'terrain',
    );
    for (const cls of list) {
      const stats = await this.prisma.$transaction((tx) => this.importClass(tx, cls), TX_OPTIONS);
      log(`classe ${cls.index} : ${stats}`);
    }
  }

  private async importClass(tx: Tx, en: Json): Promise<string> {
    const { editionId } = this.refs;
    const { classes, levels, subclasses, features, spells, labels } = this.src;
    const ownFeatures = features.list.filter((f: Json) => f.class.index === en.index);
    const ownSubclasses = subclasses.list.filter((s: Json) => s.class.index === en.index);
    const subclassFeatureLevels = ownFeatures.filter((f: Json) => f.subclass).map((f: Json) => f.level);

    // --- Classe ---
    const data = { hitDie: en.hit_die, subclassLevel: Math.min(...subclassFeatureLevels, 20) };
    const cls = await tx.class.upsert({
      where: { editionId_index: { editionId, index: en.index } },
      create: { editionId, index: en.index, ...data },
      update: data,
    });
    const classId = cls.id;
    const flavor = ownSubclasses[0]?.subclass_flavor ?? 'Subclass';
    await replaceTranslations(tx, 'classTranslation', 'classId', classId,
      translationsFor(classes, en.index, (row, locale) => ({
        name: row.name,
        subclassLabel: locale === 'en' ? flavor : labels.subclassLabels[en.index]?.[locale] ?? flavor,
      })));

    // Les enfants sont remplacés en bloc (les capacités et sous-classes, référencées
    // ailleurs, sont mises à jour par index plus bas)
    await tx.choice.deleteMany({ where: { classId } });
    await tx.classPrimaryAbility.deleteMany({ where: { classId } });
    await tx.classSavingThrow.deleteMany({ where: { classId } });
    await tx.classProficiency.deleteMany({ where: { classId } });
    await tx.classStartingEquipment.deleteMany({ where: { classId } });
    await tx.classLevel.deleteMany({ where: { classId } });
    await tx.classTableColumn.deleteMany({ where: { classId } });
    await tx.classSpellcasting.deleteMany({ where: { classId } });
    await tx.classSpell.deleteMany({ where: { classId } });
    await tx.multiclassRequirement.deleteMany({ where: { classId } });
    await tx.classMulticlassProficiency.deleteMany({ where: { classId } });

    const ability = (index: string) => this.refs.id('abilityScore', index);
    const proficiency = (index: string) => this.refs.id('proficiency', index);

    // --- Maîtrises, sauvegardes, équipement de départ ---
    await tx.classSavingThrow.createMany({
      data: await Promise.all(en.saving_throws.map(async (s: Json) => ({ classId, abilityScoreId: await ability(s.index) }))),
    });
    await tx.classProficiency.createMany({
      data: await Promise.all(en.proficiencies.map(async (p: Json) => ({ classId, proficiencyId: await proficiency(p.index) }))),
      skipDuplicates: true,
    });
    await tx.classStartingEquipment.createMany({
      data: await Promise.all(en.starting_equipment.map(async (e: Json) => ({
        classId, equipmentId: await this.refs.id('equipment', e.equipment.index), quantity: e.quantity,
      }))),
    });

    // --- Choix de la classe ---
    const sets: [ChoiceKind, Json[], (row: Json) => Json[]][] = [
      ['PROFICIENCY', en.proficiency_choices, (r) => r.proficiency_choices],
      ['STARTING_EQUIPMENT', en.starting_equipment_options, (r) => r.starting_equipment_options],
      ['MULTICLASS_PROFICIENCY', en.multi_classing.proficiency_choices ?? [], (r) => r.multi_classing?.proficiency_choices],
    ];
    let choiceCount = 0;
    for (const [kind, list, pick] of sets) {
      for (const [i, set] of list.entries()) {
        await this.choices.create(tx, { classId }, kind, set, localized(classes, en.index, (r) => pick(r)?.[i]));
        choiceCount++;
      }
    }

    // --- Multiclassage : prérequis (ET entre groupes, OU dans un groupe) ---
    const mc = en.multi_classing;
    const requirements = [
      ...(mc.prerequisites ?? []).map((p: Json, i: number) => ({ ...p, group: i + 1 })),
      ...(mc.prerequisite_options?.from.options ?? []).map((p: Json) => ({ ...p, group: (mc.prerequisites?.length ?? 0) + 1 })),
    ];
    await tx.multiclassRequirement.createMany({
      data: await Promise.all(requirements.map(async (r: Json) => ({
        classId, abilityScoreId: await ability(r.ability_score.index), minimumScore: r.minimum_score, alternativeGroup: r.group,
      }))),
    });
    await tx.classMulticlassProficiency.createMany({
      data: await Promise.all((mc.proficiencies ?? []).map(async (p: Json) => ({ classId, proficiencyId: await proficiency(p.index) }))),
      skipDuplicates: true,
    });
    // Le SRD 2014 ne donne pas de caractéristique principale : on reprend celles
    // exigées pour le multiclassage
    for (const index of new Set(requirements.map((r: Json) => r.ability_score.index as string))) {
      await tx.classPrimaryAbility.create({ data: { classId, abilityScoreId: await ability(index) } });
    }

    // --- Table de progression ---
    const classLevels = levels.list.filter((l: Json) => l.class?.index === en.index && !l.subclass);
    const columnIds = await this.createColumns(tx, classId, null, classLevels.map((l: Json) => l.class_specific ?? {}));
    for (const lvl of classLevels) {
      const sc = lvl.spellcasting ?? {};
      const created = await tx.classLevel.create({
        data: {
          classId,
          level: lvl.level,
          abilityScoreImprovements: lvl.ability_score_bonuses ?? 0,
          cantripsKnown: sc.cantrips_known ?? null,
          spellsKnown: sc.spells_known ?? null,
          spellSlots: {
            create: Array.from({ length: 9 }, (_, i) => ({ spellLevel: i + 1, slots: sc[`spell_slots_level_${i + 1}`] ?? 0 }))
              .filter((s) => s.slots > 0),
          },
        },
      });
      await this.createValues(tx, created.id, columnIds, lvl.class_specific ?? {});
    }

    // --- Incantation ---
    if (en.spellcasting) {
      const info: Json[] = en.spellcasting.info;
      const spellcasting = await tx.classSpellcasting.create({
        data: {
          classId,
          abilityScoreId: await ability(en.spellcasting.spellcasting_ability.index),
          startLevel: en.spellcasting.level,
          casterType: CASTER_TYPES[en.index] ?? 'FULL',
          ritualCasting: info.some((s) => s.name === 'Ritual Casting'),
        },
      });
      for (const [position, section] of info.entries()) {
        const created = await tx.spellcastingSection.create({ data: { spellcastingId: spellcasting.id, position } });
        const rows = [{ localeCode: 'en', data: { title: section.name, description: text(section.desc) ?? '' } }];
        for (const [localeCode, other] of Object.entries(localized(classes, en.index, (r) => r.spellcasting?.info?.[position]))) {
          if (other && text(other.desc) !== text(section.desc)) {
            rows.push({ localeCode, data: { title: other.name, description: text(other.desc) ?? '' } });
          }
        }
        await replaceTranslations(tx, 'spellcastingSectionTranslation', 'sectionId', created.id, rows);
      }
    }
    const classSpells = spells.list.filter((s: Json) => s.classes.some((c: Json) => c.index === en.index));
    await tx.classSpell.createMany({
      data: await Promise.all(classSpells.map(async (s: Json) => ({ classId, spellId: await this.refs.id('spell', s.index) }))),
    });

    // --- Sous-classes ---
    const subclassIds = new Map<string, number>();
    for (const sub of ownSubclasses) {
      const row = await tx.subclass.upsert({
        where: { editionId_index: { editionId, index: sub.index } },
        create: { editionId, index: sub.index, classId },
        update: { classId },
      });
      subclassIds.set(sub.index, row.id);
      await replaceTranslations(tx, 'subclassTranslation', 'subclassId', row.id,
        translationsFor(subclasses, sub.index, (r) => ({ name: r.name, description: text(r.desc) })));
      await tx.choice.deleteMany({ where: { subclassId: row.id } });
      await tx.subclassSpell.deleteMany({ where: { subclassId: row.id } });
      // Colonnes propres à la sous-classe (sauf si la classe a déjà la même clé)
      const subLevels = levels.list.filter((l: Json) => l.subclass?.index === sub.index && l.subclass_specific);
      const subColumns = await this.createColumns(tx, classId, row.id, subLevels.map((l: Json) => l.subclass_specific), new Set(columnIds.keys()));
      for (const lvl of subLevels) {
        const classLevel = await tx.classLevel.findUniqueOrThrow({ where: { classId_level: { classId, level: lvl.level } } });
        await this.createValues(tx, classLevel.id, subColumns, lvl.subclass_specific);
      }
    }

    // --- Capacités : création, puis parents, prérequis et choix ---
    const featureIds = new Map<string, number>();
    for (const f of ownFeatures) {
      const fdata = { level: f.level, classId, subclassId: f.subclass ? subclassIds.get(f.subclass.index)! : null };
      const row = await tx.classFeature.upsert({
        where: { editionId_index: { editionId, index: f.index } },
        create: { editionId, index: f.index, ...fdata },
        update: fdata,
      });
      featureIds.set(f.index, row.id);
      // Visible par les choix créés dans cette même transaction
      await this.refs.remember('classFeature', f.index, row.id);
      await replaceTranslations(tx, 'classFeatureTranslation', 'classFeatureId', row.id,
        translationsFor(features, f.index, (r) => ({ name: r.name, description: text(r.desc) ?? '' })));
    }
    let featureChoices = 0;
    for (const f of ownFeatures) {
      const id = featureIds.get(f.index)!;
      await tx.classFeature.update({ where: { id }, data: { parentId: f.parent ? featureIds.get(f.parent.index) ?? null : null } });
      await tx.classFeaturePrerequisite.deleteMany({ where: { classFeatureId: id } });
      await tx.choice.deleteMany({ where: { classFeatureId: id } });
      for (const p of f.prerequisites) {
        const [, index] = (p.feature ?? p.spell ?? '').split('/').slice(-2);
        await tx.classFeaturePrerequisite.create({
          data: {
            classFeatureId: id,
            type: p.type.toUpperCase() as ClassFeaturePrerequisiteType,
            minimumLevel: p.type === 'level' ? p.level : null,
            requiredFeatureId: p.type === 'feature' ? featureIds.get(index) ?? (await this.refs.id('classFeature', index)) : null,
            requiredSpellId: p.type === 'spell' ? await this.refs.id('spell', index) : null,
          },
        });
      }
      featureChoices += await this.featureChoices(tx, id, f, localized(features, f.index, (r) => r.feature_specific));
    }

    // Sorts de sous-classe (après les capacités : certains dépendent d'une capacité de terrain)
    for (const sub of ownSubclasses) {
      await tx.subclassSpell.createMany({
        data: await Promise.all((sub.spells ?? []).map(async (s: Json) => {
          const level = s.prerequisites.find((p: Json) => p.type === 'level');
          const feature = s.prerequisites.find((p: Json) => p.type === 'feature');
          return {
            subclassId: subclassIds.get(sub.index)!,
            spellId: await this.refs.id('spell', s.spell.index),
            requiredClassLevel: Number(/(\d+)$/.exec(level?.index ?? '')?.[1] ?? 1),
            requiredFeatureId: feature ? featureIds.get(feature.index)! : null,
          };
        })),
      });
    }

    return `${classLevels.length} niveaux, ${columnIds.size} colonnes, ${choiceCount} choix, ${classSpells.length} sorts, ` +
      `${ownSubclasses.length} sous-classe(s), ${ownFeatures.length} capacités (${featureChoices} choix)`;
  }

  private async featureChoices(tx: Tx, classFeatureId: number, f: Json, other: Partial<Record<LocaleCode, Json>>): Promise<number> {
    const specific = f.feature_specific;
    if (!specific) return 0;
    const kinds: [string, ChoiceKind][] = [
      ['subfeature_options', 'SUBFEATURE'],
      ['expertise_options', 'EXPERTISE'],
      ['enemy_type_options', 'FAVORED_ENEMY'],
      ['terrain_type_options', 'FAVORED_TERRAIN'],
    ];
    let count = 0;
    for (const [key, kind] of kinds) {
      if (!specific[key]) continue;
      const sub = Object.fromEntries(Object.entries(other).map(([l, v]) => [l, v?.[key]]));
      await this.choices.create(tx, { classFeatureId }, kind, specific[key], sub);
      count++;
    }
    // Manifestations occultes : simple liste de capacités enfants. Le nombre à
    // choisir dépend du niveau (colonne invocations_known) : choose = 0.
    if (specific.invocations) {
      const set = {
        desc: 'Eldritch invocations',
        choose: 0,
        from: { option_set_type: 'options_array', options: specific.invocations.map((item: Json) => ({ option_type: 'reference', item })) },
      };
      await this.choices.create(tx, { classFeatureId }, 'SUBFEATURE', set, {});
      count++;
    }
    return count;
  }

  // Crée les colonnes de table de classe à partir des clés rencontrées dans les niveaux.
  private async createColumns(
    tx: Tx,
    classId: number,
    subclassId: number | null,
    rows: Json[],
    skip: Set<string> = new Set(),
  ): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (ids.has(key) || skip.has(key)) continue;
        const valueType = columnType(value);
        if (!valueType) continue;
        const label = this.src.labels.tableColumns[key] ?? { en: humanize(key) };
        const column = await tx.classTableColumn.create({ data: { classId, subclassId, key, valueType, position: ids.size + skip.size } });
        await tx.classTableColumnTranslation.createMany({
          data: Object.entries<string>(label).map(([localeCode, text]) => ({ columnId: column.id, localeCode, label: text })),
        });
        ids.set(key, column.id);
      }
    }
    return ids;
  }

  private async createValues(tx: Tx, classLevelId: number, columns: Map<string, number>, values: Json): Promise<void> {
    const data = Object.entries(values)
      .filter(([key]) => columns.has(key))
      .map(([key, value]) => ({ classLevelId, columnId: columns.get(key)!, ...columnValue(value) }));
    if (data.length) await tx.classLevelValue.createMany({ data });
  }
}
