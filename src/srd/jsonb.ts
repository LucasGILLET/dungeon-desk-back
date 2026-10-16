import { z } from 'zod';

// Schémas des colonnes JSONB du socle SRD.
// Règle : uniquement des valeurs neutres en langue (nombres, dés, index), jamais de texte.
// Chaque colonne Json du schéma Prisma indique en commentaire le schéma attendu ici.

// Notation de dés : "1d8", "2d6+5", "1d10-1", une somme "4d6+4d6" (deux types de
// dégâts, ex. Colonne de flamme) ou une valeur fixe "1".
// Le suffixe "+MOD" désigne le modificateur de caractéristique d'incantation (soins).
export const DICE_REGEX = /^(\d+d\d+|\d+)(\+\d+d\d+)*([+-]\d+)?(\+MOD)?$/;
export const DiceSchema = z.string().regex(DICE_REGEX, 'Notation de dés invalide');

// Montée en puissance des dégâts ou des soins d'un sort.
// Clés : niveau d'emplacement ("1".."9") ou niveau de personnage ("1", "5", "11", "17").
const levelKey = z.string().regex(/^([1-9]|1\d|20)$/, 'Niveau invalide');
export const DiceScalingSchema = z
  .object({
    by: z.enum(['slot_level', 'character_level']),
    values: z.record(levelKey, DiceSchema),
  })
  .strict();

export type DiceScaling = z.infer<typeof DiceScalingSchema>;
