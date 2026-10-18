// Langues et éditions : prérequis de tous les autres imports.
import { PrismaClient } from '@prisma/client';
import { log, replaceTranslations, TX_OPTIONS } from '../context';

// L'anglais est la langue de repli : c'est la seule traduction complète du SRD.
// La langue d'affichage par défaut (français) relève du front et de Accept-Language.
const LOCALES = [
  { code: 'en', name: 'English', isDefault: true, position: 1 },
  { code: 'fr', name: 'Français', isDefault: false, position: 2 },
];

const EDITIONS = [
  {
    code: '2014',
    releaseYear: 2014,
    isDefault: true,
    position: 1,
    // Achat de points (27 points, valeurs de 8 à 15) et tableau standard
    pointBuyBudget: 27,
    pointBuyCosts: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
    standardArray: [15, 14, 13, 12, 10, 8],
    translations: {
      en: {
        name: 'D&D 5e (2014)',
        attribution:
          'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
      },
      fr: {
        name: 'D&D 5e (2014)',
        attribution:
          'Ce contenu inclut des éléments tirés du System Reference Document 5.1 (« SRD 5.1 ») de Wizards of the Coast LLC, disponible sur https://dnd.wizards.com/resources/systems-reference-document. Le SRD 5.1 est distribué sous licence Creative Commons Attribution 4.0 International : https://creativecommons.org/licenses/by/4.0/legalcode.',
      },
    },
  },
];

export async function importBase(prisma: PrismaClient): Promise<void> {
  for (const locale of LOCALES) {
    await prisma.locale.upsert({ where: { code: locale.code }, create: locale, update: locale });
  }
  for (const { translations, ...edition } of EDITIONS) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.edition.upsert({ where: { code: edition.code }, create: edition, update: edition });
      await replaceTranslations(
        tx,
        'editionTranslation',
        'editionId',
        row.id,
        Object.entries(translations).map(([localeCode, data]) => ({ localeCode, data })),
      );
    }, TX_OPTIONS);
  }
  log(`${LOCALES.length} langues, ${EDITIONS.length} édition(s)`);
}
