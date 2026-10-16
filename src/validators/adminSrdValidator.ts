import { z } from 'zod';

const text = z.string().trim();
const requiredText = text.min(1, 'Champ obligatoire');

// Textes d'une classe pour une langue
const classTexts = z.object({
  name: requiredText,
  subclassLabel: requiredText,
  description: text.nullish(),
});

const featureTexts = z.object({
  name: requiredText,
  description: requiredText,
});

// Clés : codes de langue ("fr", "en") ; vérifiés contre la table Locale par le contrôleur
const byLocale = <T extends z.ZodTypeAny>(schema: T) => z.record(z.string().min(2).max(10), schema);

export const updateClassSchema = z
  .object({
    hitDie: z.number().int().refine((v) => [6, 8, 10, 12].includes(v), 'Dé de vie : 6, 8, 10 ou 12'),
    subclassLevel: z.number().int().min(1).max(20),
    translations: byLocale(classTexts),
    features: z.array(z.object({ id: z.number().int().positive(), translations: byLocale(featureTexts) })),
  })
  .partial()
  .strict();

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

// Entités dont les textes sont éditables depuis la page « Traductions à faire »
export const TRANSLATABLE = {
  class: { model: 'classTranslation', fk: 'classId', fields: ['name', 'subclassLabel', 'description'], required: ['name', 'subclassLabel'] },
  subclass: { model: 'subclassTranslation', fk: 'subclassId', fields: ['name', 'description'], required: ['name'] },
  classFeature: { model: 'classFeatureTranslation', fk: 'classFeatureId', fields: ['name', 'description'], required: ['name', 'description'] },
  choice: { model: 'choiceTranslation', fk: 'choiceId', fields: ['description'], required: ['description'] },
  spellcastingSection: { model: 'spellcastingSectionTranslation', fk: 'sectionId', fields: ['title', 'description'], required: ['title', 'description'] },
  classTableColumn: { model: 'classTableColumnTranslation', fk: 'columnId', fields: ['label'], required: ['label'] },
} as const;

export type TranslatableEntity = keyof typeof TRANSLATABLE;

export function translationSchema(entity: TranslatableEntity) {
  const { fields, required } = TRANSLATABLE[entity];
  const shape = Object.fromEntries(
    fields.map((f) => [f, (required as readonly string[]).includes(f) ? requiredText : text.nullish()]),
  );
  return z.object(shape).strict();
}
