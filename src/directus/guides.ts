// Formulaires des guides (pages de documentation), pensés pour un rédacteur non
// technique : champs techniques masqués et remplis automatiquement (flow),
// ordre au glisser-déposer, français seul par défaut, aide sur chaque champ,
// aperçu dans l'application.
import { api, fr, Json, upsertAlias } from './client';

// Origine du front pour l'aperçu (« Voir sur le site »)
const FRONT_URL = process.env.DIRECTUS_PREVIEW_URL ?? 'http://localhost:5173';
const FLOW_NAME = 'Guides : remplissage automatique';

const note = (text: string) => ({ note: text });
const hidden = { hidden: true, required: false };

async function field(collection: string, name: string, meta: Json): Promise<void> {
  await api('PATCH', `/fields/${collection}/${name}`, { meta });
}

// Traductions : français seul, l'anglais s'ouvre à la demande
async function frenchFirst(collection: string): Promise<void> {
  await field(collection, 'translations', {
    options: { languageField: 'name', defaultLanguage: 'fr', userLanguage: false, defaultOpenSplitView: false },
  });
}

// Liste liée triable au glisser-déposer, sans « Sélectionner » (qui déplacerait
// une section d'une autre page)
async function sortableList(parent: string, alias: string, child: string, fk: string, template: string, label: string): Promise<void> {
  await api('PATCH', `/relations/${child}/${fk}`, { meta: { one_field: alias, sort_field: 'position' } });
  await upsertAlias(parent, alias, {
    special: ['o2m'], interface: 'list-o2m', options: { template, enableLink: false, enableSelect: false },
    display: 'related-values', display_options: { template }, translations: fr(label),
  });
}

// Flow « filtre » à la création : identifiant tiré du titre, édition, position
// en fin de liste. Le code tourne dans Directus (Run Script, sans accès base).
function fillScript(editionId: number): string {
  return `module.exports = async function (data) {
  const payload = { ...data.$trigger.payload };
  const collection = data.$trigger.collection;
  const rows = Array.isArray(payload.translations) ? payload.translations : (payload.translations && payload.translations.create) || [];
  const fr = rows.find((t) => t.localeCode === 'fr' || (t.localeCode && t.localeCode.code === 'fr')) || rows[0] || {};
  // « L'économie » → economie : sans accents ni article élidé
  const slug = String(fr.title || fr.label || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()
    .replace(/^(l|d)['’]/, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  if (collection !== 'GuideCardList' && !payload.index) {
    // Page : identifiant lisible (lien /documentation?section=…) ; section et carte : suffixe aléatoire (unicité)
    payload.index = collection === 'GuidePage' ? (slug || 'page-' + suffix) : (slug || (collection === 'GuideCard' ? 'carte' : 'section')) + '-' + suffix;
  }
  if (collection === 'GuidePage' && payload.editionId == null) payload.editionId = ${editionId};
  // Secondes écoulées depuis 2026 : le nouvel élément se range après les existants
  if (payload.position == null) payload.position = Math.floor(Date.now() / 1000) - 1767225600;
  return payload;
};`;
}

async function configureFlow(): Promise<void> {
  const [edition] = await api('GET', '/items/Edition?filter[isDefault][_eq]=true&fields=id');
  const flowData = {
    name: FLOW_NAME, icon: 'auto_fix_high', color: '#8B5CF6', status: 'active', trigger: 'event', accountability: 'all',
    description: 'Remplit les champs techniques des guides créés dans Directus (identifiant, édition, ordre).',
    // return : sans lui, Directus ignore le résultat du script (la charge utile n'est pas remplacée)
    options: { type: 'filter', scope: ['items.create'], collections: ['GuidePage', 'GuideSection', 'GuideCard', 'GuideCardList'], return: '$last' },
  };
  const [existing] = await api('GET', `/flows?filter[name][_eq]=${encodeURIComponent(FLOW_NAME)}&fields=id,operation`);
  const flow = existing ?? (await api('POST', '/flows', flowData));
  await api('PATCH', `/flows/${flow.id}`, flowData);
  const operation = { name: 'Remplir les champs', key: 'remplir', type: 'exec', position_x: 19, position_y: 1, options: { code: fillScript(edition.id) } };
  if (flow.operation) await api('PATCH', `/operations/${flow.operation}`, operation);
  else {
    const created = await api('POST', '/operations', { ...operation, flow: flow.id });
    await api('PATCH', `/flows/${flow.id}`, { operation: created.id });
  }
}

// Disposition par défaut de la liste des pages : titre, publiée, dans l'ordre
async function configureListPreset(): Promise<void> {
  const preset = {
    collection: 'GuidePage', user: null, role: null, bookmark: null, layout: 'tabular',
    layout_query: { tabular: { fields: ['translations', 'published'], sort: ['position'] } },
  };
  const [existing] = await api('GET', '/presets?filter[collection][_eq]=GuidePage&filter[user][_null]=true&filter[role][_null]=true&filter[bookmark][_null]=true&fields=id');
  if (existing) await api('PATCH', `/presets/${existing.id}`, preset);
  else await api('POST', '/presets', preset);
}

export async function configureGuideForms(): Promise<void> {
  await api('PATCH', '/collections/GuidePage', {
    meta: {
      sort_field: 'position',
      display_template: '{{translations.title}}',
      note: "Pages de la documentation (Apprendre DnD). Glissez les lignes pour changer l'ordre du menu.",
      preview_url: `${FRONT_URL}/documentation?section={{index}}`,
    },
  });
  for (const c of ['GuideSection', 'GuideCard', 'GuideCardList']) await api('PATCH', `/collections/${c}`, { meta: { sort_field: 'position' } });

  // Page
  await field('GuidePage', 'editionId', hidden);
  await field('GuidePage', 'position', hidden);
  // Identifiant tiré du titre par le flow ; l'aperçu (« Voir sur le site ») donne le lien de la page
  await field('GuidePage', 'index', hidden);
  await field('GuidePage', 'published', note("Décochée : la page reste un brouillon, invisible dans le menu (l'aperçu fonctionne quand même)."));
  await field('GuidePage', 'icon', { width: 'half', ...note('Facultatif : un emoji, par exemple 💰') });
  await field('GuidePage', 'accent', note('Facultatif : couleur du badge de la page'));
  await frenchFirst('GuidePage');
  await field('GuidePage', 'translations', { translations: fr('Titre et textes') });
  await sortableList('GuidePage', 'sections', 'GuideSection', 'pageId', '{{translations.title}}', 'Parties de la page');
  await field('GuidePageTranslation', 'title', note("Nom dans le menu de la documentation, par exemple « L'économie »"));
  await field('GuidePageTranslation', 'shortTitle', note('Petit badge coloré au-dessus du titre, par exemple « Économie »'));
  await field('GuidePageTranslation', 'eyebrow', note('Petit texte gris à côté du badge, par exemple « Monnaie et commerce »'));
  await field('GuidePageTranslation', 'heading', note('Grand titre en haut de la page ; vide : le nom du menu'));
  await field('GuidePageTranslation', 'intro', note("Paragraphe d'introduction, sous le titre"));

  // Partie (section)
  for (const f of ['pageId', 'index', 'position', 'openedBy']) await field('GuideSection', f, hidden);
  await field('GuideSection', 'level', {
    interface: 'select-dropdown', width: 'half',
    options: { choices: [{ text: 'Partie (grand titre)', value: 1 }, { text: 'Sous-partie', value: 2 }, { text: 'Sous-sous-partie', value: 3 }] },
    display: 'labels',
    display_options: { choices: [{ text: 'Partie', value: 1 }, { text: 'Sous-partie', value: 2 }, { text: 'Sous-sous-partie', value: 3 }] },
    translations: fr('Taille du titre'),
  });
  await field('GuideSection', 'icon', { width: 'half', ...note("Aide-mémoire de combat seulement : emoji de la tuile") });
  await field('GuideSection', 'accent', note('Aide-mémoire de combat seulement : couleur de la tuile'));
  await frenchFirst('GuideSection');
  await sortableList('GuideSection', 'cards', 'GuideCard', 'sectionId', '{{translations.title}}', 'Cartes (encadrés sous le texte)');
  await field('GuideSectionTranslation', 'title', note('Titre de la partie (facultatif)'));
  await field('GuideSectionTranslation', 'subtitle', note('Aide-mémoire de combat seulement'));
  await field('GuideSectionTranslation', 'body', note('Texte de la partie. Les boutons du haut mettent en gras, en italique ou en liste.'));

  // Carte
  for (const f of ['sectionId', 'index', 'position']) await field('GuideCard', f, hidden);
  await field('GuideCard', 'icon', { width: 'half', ...note('Facultatif : un emoji devant le titre') });
  await field('GuideCard', 'accent', note('Facultatif : couleur de la carte'));
  await field('GuideCard', 'ruleSectionId', note('Facultatif : ajoute un lien « Règle : … » vers les règles du SRD'));
  await field('GuideCard', 'classId', note('Facultatif : classe dont parle la carte'));
  await field('GuideCard', 'raceId', note('Facultatif : race dont parle la carte'));
  await field('GuideCard', 'detailSectionId', note('Aide-mémoire de combat seulement : partie ouverte au clic sur la carte'));
  await frenchFirst('GuideCard');
  await sortableList('GuideCard', 'lists', 'GuideCardList', 'cardId', '{{translations.label}}', 'Listes à puces');
  await field('GuideCardTranslation', 'eyebrow', note('Petit texte gris au-dessus du titre (facultatif)'));
  await field('GuideCardTranslation', 'summary', note('Texte de la carte'));
  await field('GuideCardTranslation', 'advice', note('Encadré « À retenir » en bas de la carte (facultatif)'));

  // Liste à puces
  for (const f of ['cardId', 'position']) await field('GuideCardList', f, hidden);
  await frenchFirst('GuideCardList');
  await field('GuideCardListTranslation', 'label', note('Titre de la liste (facultatif), par exemple « Talents raciaux »'));
  await field('GuideCardListTranslation', 'items', { interface: 'input-multiline', ...note('Une puce par ligne') });

  await configureFlow();
  await configureListPreset();
}
