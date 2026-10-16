// Client minimal de l'API Directus pour le script de configuration.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.directus' });

const BASE = process.env.DIRECTUS_URL ?? 'http://127.0.0.1:8055';
const TOKEN = process.env.DIRECTUS_TOKEN ?? process.env.ADMIN_TOKEN;

export type Json = any;

export async function api(method: string, path: string, body?: unknown): Promise<Json> {
  if (!TOKEN) throw new Error('Jeton manquant : DIRECTUS_TOKEN ou ADMIN_TOKEN (dans .env.directus)');
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${json?.errors?.[0]?.message ?? JSON.stringify(json)}`);
  }
  return json?.data;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await api('GET', path);
    return true;
  } catch {
    return false;
  }
}

// Crée un champ alias (relation inverse, groupe, traductions) s'il n'existe pas, puis met à jour son meta.
export async function upsertAlias(collection: string, field: string, meta: Json): Promise<void> {
  if (await exists(`/fields/${collection}/${field}`)) {
    await api('PATCH', `/fields/${collection}/${field}`, { meta });
  } else {
    await api('POST', `/fields/${collection}`, { field, type: 'alias', meta, schema: null });
  }
}

export const fr = (translation: string) => [{ language: 'fr-FR', translation }];
