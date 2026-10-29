// Recherche globale dans les données de jeu : noms dans toutes les langues (un
// nom anglais trouve aussi la fiche française), sans accents ni majuscules,
// tolérante aux fautes de frappe (pg_trgm), puis dans les descriptions.
import prisma from '../prismaClient';
import { LangContext } from './lang';

export type SearchKind =
  | 'spell' | 'monster' | 'magic-item' | 'equipment' | 'class' | 'subclass' | 'race' | 'subrace'
  | 'feat' | 'background' | 'condition' | 'rule' | 'guide';

export interface SearchResult {
  kind: SearchKind;
  index: string;
  name: string;
  // Nom trouvé quand il diffère du nom affiché (« Fireball » pour « Boule de feu »)
  matched: string | null;
  // Niveau du sort, FP du monstre, rareté de l'objet, classe de la sous-classe…
  detail: string | null;
  // Texte affiché dans la recherche pour ce qui n'a pas de page à soi
  text: string | null;
  score: number;
  // Contenu maison de l'utilisateur connecté
  mine: boolean;
}

interface Source {
  kind: SearchKind;
  table: string;
  fk: string;
  name?: string;
  // Colonne cherchée en dernier recours, dans la langue demandée
  description?: string;
  text?: string;
  detail?: string;
  // Contenu maison : seulement celui de l'utilisateur connecté ($5)
  homebrew?: boolean;
  where?: string;
}

// Nom d'une ligne liée dans la langue demandée ($3), sinon celle par défaut ($4)
const translated = (table: string, fk: string, id: string, column = 'name') =>
  `(SELECT x."${column}" FROM "${table}Translation" x WHERE x."${fk}" = ${id} ORDER BY (x."localeCode" = $3) DESC, (x."localeCode" = $4) DESC, x."localeCode" LIMIT 1)`;

const SOURCES: Source[] = [
  { kind: 'spell', table: 'Spell', fk: 'spellId', description: 'description', detail: 'p."level"::text', homebrew: true },
  { kind: 'monster', table: 'Monster', fk: 'monsterId', description: 'description', detail: 'p."challengeRating"::text', homebrew: true },
  { kind: 'magic-item', table: 'MagicItem', fk: 'magicItemId', description: 'description', detail: 'p."rarity"::text', homebrew: true },
  { kind: 'equipment', table: 'Equipment', fk: 'equipmentId', description: 'description', text: 'description', homebrew: true },
  { kind: 'class', table: 'Class', fk: 'classId', text: 'summary', homebrew: true },
  { kind: 'subclass', table: 'Subclass', fk: 'subclassId', text: 'description', detail: translated('Class', 'classId', 'p."classId"'), homebrew: true },
  { kind: 'race', table: 'Race', fk: 'raceId', text: 'summary', homebrew: true },
  { kind: 'subrace', table: 'Subrace', fk: 'subraceId', text: 'description', detail: translated('Race', 'raceId', 'p."raceId"'), homebrew: true },
  { kind: 'feat', table: 'Feat', fk: 'featId', description: 'description', text: 'description', homebrew: true },
  { kind: 'background', table: 'Background', fk: 'backgroundId', text: 'summary', homebrew: true },
  { kind: 'condition', table: 'Condition', fk: 'conditionId', description: 'description', text: 'description' },
  { kind: 'rule', table: 'RuleSection', fk: 'ruleSectionId', description: 'description', detail: translated('RuleChapter', 'ruleChapterId', 'p."chapterId"') },
  { kind: 'guide', table: 'GuidePage', fk: 'guidePageId', name: 'title', description: 'intro', where: 'p."published"' },
];

// Sans accents ni majuscules, apostrophes typographiques comprises (« d’or » = « d'or »)
const norm = (expr: string) => `lower(unaccent(replace(${expr}, '’', '''')))`;

// Pertinence d'une traduction : nom exact, début du nom, nom qui contient la
// recherche, nom proche (fautes de frappe), enfin la description
function score(s: Source): string {
  const n = norm(`t."${s.name ?? 'name'}"`);
  const description = s.description
    ? `WHEN length(q.q) >= 4 AND t."localeCode" = $3 AND ${norm(`coalesce(t."${s.description}", '')`)} LIKE '%' || q.q || '%' THEN 0.3`
    : '';
  return `CASE
    WHEN ${n} = q.q THEN 1
    WHEN ${n} LIKE q.q || '%' THEN 0.9
    WHEN ${n} LIKE '%' || q.q || '%' THEN 0.8
    WHEN word_similarity(q.q, ${n}) >= 0.5 THEN 0.4 + 0.3 * word_similarity(q.q, ${n})
    ${description}
    ELSE 0 END`;
}

function select(s: Source): string {
  const name = s.name ?? 'name';
  const where = [s.homebrew ? '(p."ownerId" IS NULL OR p."ownerId" = $5)' : '', s.where ?? ''].filter(Boolean).map((w) => ` AND ${w}`).join('');
  return `SELECT '${s.kind}' AS kind, p."index", max(m.score) AS score,
    (array_agg(t."${name}" ORDER BY m.score DESC, (t."localeCode" = $3) DESC))[1] AS matched,
    ${translated(s.table, s.fk, 'p.id', name)} AS name,
    ${s.detail ?? 'NULL'} AS detail,
    ${s.text ? translated(s.table, s.fk, 'p.id', s.text) : 'NULL'} AS text,
    ${s.homebrew ? 'p."ownerId" IS NOT NULL' : 'false'} AS mine
  FROM "${s.table}" p
  JOIN "Edition" e ON e.id = p."editionId"
  JOIN "${s.table}Translation" t ON t."${s.fk}" = p.id
  CROSS JOIN q
  CROSS JOIN LATERAL (SELECT ${score(s)} AS score) m
  WHERE e.code = $2${where} AND m.score > 0
  GROUP BY p.id, p."index"`;
}

const SQL = `WITH q AS (SELECT ${norm('$1::text')} AS q)
${SOURCES.map(select).join('\nUNION ALL\n')}
ORDER BY score DESC, mine DESC, name
LIMIT 200`;

export const PER_KIND = 8;

// Les caractères spéciaux de LIKE ne servent à rien dans une recherche
export const normalizeQuery = (q: string) => q.replace(/[\\%_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export async function search(edition: string, query: string, ctx: LangContext, userId: number | null = null): Promise<SearchResult[]> {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const rows = await prisma.$queryRawUnsafe<(Omit<SearchResult, 'score'> & { score: unknown })[]>(SQL, q, edition, ctx.lang, ctx.fallback, userId);
  const perKind = new Map<SearchKind, number>();
  return rows.flatMap((r) => {
    const count = perKind.get(r.kind) ?? 0;
    if (count >= PER_KIND) return [];
    perKind.set(r.kind, count + 1);
    const score = Number(r.score);
    // Seulement quand ce nom contient la recherche (pas pour un nom approchant ni la description)
    return [{ ...r, matched: score >= 0.8 && r.matched !== r.name ? r.matched : null, score }];
  });
}
