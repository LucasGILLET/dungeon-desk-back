// Gestionnaire de combat : combattants de départ (groupe de la campagne et
// monstres d'une rencontre) et vue censurée pour les joueurs.
import prisma from '../prismaClient';
import { loadRulesContext } from '../characters/context';
import { describeArmorClass } from '../characters/describe';
import { analyse } from '../characters/rules';
import { CHARACTER_INCLUDE, toInput } from '../characters/store';
import { LangContext, pick } from '../srd/lang';

export interface StartingCombatant {
  kind: 'CHARACTER' | 'MONSTER';
  characterId: number | null;
  monsterId: number | null;
  name: string;
  initiativeBonus: number;
  armorClass: number | null;
  maxHitPoints: number | null;
  hitPoints: number | null;
}

const modifier = (score: number) => Math.floor((score - 10) / 2);

// Personnages du groupe : ceux des joueurs et ceux du MJ, avec les valeurs de
// leur fiche (CA, PV max et actuels, bonus d'initiative = modificateur de DEX)
export async function partyCombatants(campaignId: number, lang: LangContext): Promise<StartingCombatant[]> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: { members: { select: { characterId: true } }, gmCharacters: { select: { characterId: true } } },
  });
  const ids = [...new Set([...campaign.members.map((m) => m.characterId), ...campaign.gmCharacters.map((g) => g.characterId)].filter((v): v is number => v != null))];
  const characters = await prisma.character.findMany({ where: { id: { in: ids } }, include: CHARACTER_INCLUDE, orderBy: { name: 'asc' } });
  return Promise.all(characters.map(async (c) => {
    const input = toInput(c);
    const ctx = await loadRulesContext(prisma, input);
    const { sheet } = analyse(input, ctx);
    const armorClass = sheet ? (await describeArmorClass(prisma, ctx, input, sheet, lang)).value : null;
    const max = sheet?.maxHitPoints ?? null;
    return {
      kind: 'CHARACTER' as const,
      characterId: c.id,
      monsterId: null,
      name: c.name,
      initiativeBonus: sheet?.abilityScores.dex?.modifier ?? 0,
      armorClass,
      maxHitPoints: max,
      hitPoints: input.state.currentHitPoints ?? max,
    };
  }));
}

// Monstres d'une rencontre, numérotés quand il y en a plusieurs (« Gobelin 2 »)
export async function encounterCombatants(encounterId: number, lang: LangContext): Promise<StartingCombatant[]> {
  const rows = await prisma.encounterMonster.findMany({
    where: { encounterId },
    orderBy: { id: 'asc' },
    include: { monster: { select: { id: true, hitPoints: true, dexterity: true, translations: { orderBy: { localeCode: 'asc' } }, armorClasses: { orderBy: { position: 'asc' }, take: 1 } } } },
  });
  return rows.flatMap((row) => Array.from({ length: row.count }, (_, i) => ({
    kind: 'MONSTER' as const,
    characterId: null,
    monsterId: row.monster.id,
    name: `${pick(row.monster.translations, lang).name}${row.count > 1 ? ` ${i + 1}` : ''}`,
    initiativeBonus: modifier(row.monster.dexterity),
    armorClass: row.monster.armorClasses[0]?.value ?? null,
    maxHitPoints: row.monster.hitPoints,
    hitPoints: row.monster.hitPoints,
  })));
}

// État de santé visible par les joueurs pour une créature du MJ : jamais ses
// PV exacts (règle courante « sanguinolent » à la moitié des PV)
export function healthLabel(hitPoints: number | null, maxHitPoints: number | null): 'UNHURT' | 'HURT' | 'BLOODIED' | 'DOWN' | null {
  if (hitPoints == null || !maxHitPoints) return null;
  if (hitPoints <= 0) return 'DOWN';
  if (hitPoints >= maxHitPoints) return 'UNHURT';
  return hitPoints <= maxHitPoints / 2 ? 'BLOODIED' : 'HURT';
}
