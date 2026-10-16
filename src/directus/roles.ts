// Rôles Directus des données de jeu. Chaque rôle reçoit une policy dont les
// permissions sont recréées à chaque exécution (idempotent).
import { api, Json } from './client';

interface RoleDefinition {
  name: string;
  icon: string;
  description: string;
  permissions: (srd: string[], translations: string[]) => { collection: string; action: string }[];
}

const crud = (collections: string[], actions: string[]) => collections.flatMap((collection) => actions.map((action) => ({ collection, action })));

const ROLES: RoleDefinition[] = [
  {
    name: 'Éditeur des données de jeu',
    icon: 'edit_note',
    description: 'Lit et modifie tout le contenu SRD (classes, sorts, équipement…). Ne peut supprimer que des traductions et des liaisons.',
    permissions: (srd, translations) => [
      ...crud(srd, ['read', 'create', 'update']),
      ...crud(translations, ['delete']),
    ],
  },
  {
    name: 'Traducteur',
    icon: 'translate',
    description: 'Lit tout le contenu SRD et ne modifie que les traductions.',
    permissions: (srd, translations) => [
      ...crud(srd, ['read']),
      ...crud(translations, ['create', 'update']),
    ],
  },
];

async function findOne(collection: string, name: string): Promise<Json | undefined> {
  const rows = await api('GET', `/${collection}?filter[name][_eq]=${encodeURIComponent(name)}&fields=id`);
  return rows[0];
}

export async function configureRoles(srd: string[], translations: string[]): Promise<string> {
  for (const role of ROLES) {
    const policyData = { name: role.name, icon: role.icon, description: role.description, app_access: true, admin_access: false };
    const policy = (await findOne('policies', role.name)) ?? (await api('POST', '/policies', policyData));
    await api('PATCH', `/policies/${policy.id}`, policyData);

    const existing: Json[] = await api('GET', `/permissions?filter[policy][_eq]=${policy.id}&fields=id&limit=-1`);
    if (existing.length) await api('DELETE', '/permissions', existing.map((p) => p.id));
    await api('POST', '/permissions', role.permissions(srd, translations).map((p) => ({ ...p, policy: policy.id, fields: ['*'], permissions: {}, validation: {} })));

    const roleData = { name: role.name, icon: role.icon, description: role.description };
    const created = (await findOne('roles', role.name)) ?? (await api('POST', '/roles', roleData));
    await api('PATCH', `/roles/${created.id}`, roleData);
    const access: Json[] = await api('GET', `/access?filter[role][_eq]=${created.id}&filter[policy][_eq]=${policy.id}&fields=id`);
    if (!access.length) await api('POST', '/access', { role: created.id, policy: policy.id });
  }
  return `${ROLES.length} rôles`;
}
