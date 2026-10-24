// Ce que coûte une capacité ou un trait pendant le tour, lu dans sa description
// (« enter a rage as a bonus action », « use your reaction », « as an action ») :
// la première tournure trouvée l'emporte. Les fichiers maison sont en français.
import { ActivationType } from '@prisma/client';

const PATTERNS: [ActivationType, RegExp][] = [
  ['BONUS_ACTION', /\bbonus action\b|\baction bonus\b/i],
  ['REACTION', /\b(?:use your reaction|as a reaction|your reaction to|use a reaction)\b|\bvotre réaction\b|\bune réaction\b/i],
  ['ACTION', /\b(?:use your action|as an action|an action to)\b|\bvotre action pour\b|\bpar une action\b|\bune action pour\b/i],
];

// Descriptions trompeuses : une action de plus (Sursaut d'activité), une option
// de métamagie, une heure de bricolage
const OVERRIDES: Record<string, ActivationType | null> = {
  'action-surge-1-use': null,
  'action-surge-2-uses': null,
  'metamagic-quickened-spell': null,
  tinker: null,
};

export function parseActivation(index: string, desc: string): ActivationType | null {
  if (index in OVERRIDES) return OVERRIDES[index]!;
  let best: { kind: ActivationType; at: number } | null = null;
  for (const [kind, pattern] of PATTERNS) {
    const at = desc.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { kind, at };
  }
  return best?.kind ?? null;
}
