// Difficulté d'une rencontre (Guide du maître 2014, chapitre 3) : XP des
// monstres × multiplicateur selon leur nombre, comparés aux seuils des
// personnages selon leur niveau. Pur : testé sans base.

export type EncounterDifficulty = 'TRIVIAL' | 'EASY' | 'MEDIUM' | 'HARD' | 'DEADLY';

// Seuils d'XP par personnage : [facile, moyenne, difficile, mortelle], niveaux 1 à 20
const THRESHOLDS: [number, number, number, number][] = [
  [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500],
  [250, 500, 750, 1100], [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400], [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700],
];

// Multiplicateurs, du plus faible au plus fort
const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4];

// Rang du multiplicateur selon le nombre de monstres (1 → ×1, 2 → ×1,5, 3-6 → ×2…)
function multiplierRank(monsters: number): number {
  if (monsters <= 1) return 1;
  if (monsters === 2) return 2;
  if (monsters <= 6) return 3;
  if (monsters <= 10) return 4;
  if (monsters <= 14) return 5;
  return 6;
}

export interface EncounterEvaluation {
  totalXp: number // XP gagnée (à partager)
  adjustedXp: number // XP ajustée pour juger la difficulté
  multiplier: number
  thresholds: { easy: number; medium: number; hard: number; deadly: number } | null
  difficulty: EncounterDifficulty | null // null : aucun personnage de niveau connu
}

export function evaluateEncounter(monsters: { xp: number; count: number }[], partyLevels: number[]): EncounterEvaluation {
  const count = monsters.reduce((sum, m) => sum + m.count, 0);
  const totalXp = monsters.reduce((sum, m) => sum + m.xp * m.count, 0);
  const levels = partyLevels.filter((l) => l >= 1).map((l) => Math.min(20, Math.floor(l)));

  // Moins de 3 personnages : multiplicateur supérieur ; 6 ou plus : inférieur
  let rank = multiplierRank(count);
  if (levels.length && levels.length < 3) rank += 1;
  else if (levels.length >= 6) rank -= 1;
  const multiplier = count ? MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, rank))] : 1;
  const adjustedXp = Math.round(totalXp * multiplier);

  if (!levels.length) return { totalXp, adjustedXp, multiplier, thresholds: null, difficulty: null };
  const sum = (i: number) => levels.reduce((total, level) => total + THRESHOLDS[level - 1][i], 0);
  const thresholds = { easy: sum(0), medium: sum(1), hard: sum(2), deadly: sum(3) };
  const difficulty: EncounterDifficulty = adjustedXp >= thresholds.deadly ? 'DEADLY'
    : adjustedXp >= thresholds.hard ? 'HARD'
      : adjustedXp >= thresholds.medium ? 'MEDIUM'
        : adjustedXp >= thresholds.easy ? 'EASY'
          : 'TRIVIAL';
  return { totalXp, adjustedXp, multiplier, thresholds, difficulty };
}
