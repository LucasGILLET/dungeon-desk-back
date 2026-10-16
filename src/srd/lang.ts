// Langue d'une réponse : traductions aplaties dans l'objet, langue demandée,
// sinon langue par défaut (voir docs/modelisation/conventions.md).
import { Request } from 'express';
import prisma from '../prismaClient';

type Translated = { localeCode: string };

export interface LangContext {
  lang: string;
  fallback: string;
}

let localesCache: { codes: string[]; fallback: string } | null = null;

async function locales() {
  if (!localesCache) {
    const rows = await prisma.locale.findMany({ orderBy: { position: 'asc' } });
    localesCache = { codes: rows.map((r) => r.code), fallback: rows.find((r) => r.isDefault)?.code ?? 'en' };
  }
  return localesCache;
}

// ?lang=fr, sinon le premier code connu de Accept-Language, sinon la langue par défaut
export async function resolveLang(req: Request): Promise<LangContext> {
  const { codes, fallback } = await locales();
  const wanted = [
    typeof req.query.lang === 'string' ? req.query.lang : undefined,
    ...(req.headers['accept-language'] ?? '').split(',').map((part) => part.split(';')[0].trim().slice(0, 2)),
  ];
  return { lang: wanted.find((code) => code && codes.includes(code)) ?? fallback, fallback };
}

export function pick<T extends Translated>(translations: T[], ctx: LangContext): T & { lang: string } {
  const row = translations.find((t) => t.localeCode === ctx.lang)
    ?? translations.find((t) => t.localeCode === ctx.fallback)
    ?? translations[0];
  return { ...row, lang: row?.localeCode };
}

// Toutes les langues : un contenu maison n'existe parfois que dans la langue de son
// auteur (sous-classes custom en français) ; pick() retombe alors sur celle-ci.
export const allLangs = { orderBy: { localeCode: 'asc' as const } };
