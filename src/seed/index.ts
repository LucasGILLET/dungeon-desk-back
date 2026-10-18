// Seed des données de jeu (SRD) : `npx prisma db seed`
//
// Options (après `--`) :
//   --edition 2014           édition à importer (défaut : 2014)
//   --only <domaines>        liste séparée par des virgules parmi :
//                            base, referentiels, equipement, maitrises, sorts, classes, races, historiques, presentation, pnj,
//                            monstres, objets-magiques, regles, guides
//   --classes <index>        classes à importer (défaut : toutes), ex. wizard,fighter
//
// Chaque domaine ne dépend que des précédents ; relancer le seed met à jour les
// données sans créer de doublons.
import 'dotenv/config';
import { createClient, log, Refs } from './context';
import { importBase } from './importers/base';
import { importReferentiels } from './importers/referentiels';
import { importEquipment, importProficiencies } from './importers/equipment';
import { importSpells } from './importers/spells';
import { ClassImporter } from './importers/classes';
import { importRaces } from './importers/races';
import { importBackgrounds } from './importers/backgrounds';
import { importPresentation } from './importers/presentation';
import { importNpcGenerator } from './importers/npcGenerator';
import { importMonsters } from './importers/monsters';
import { importMagicItems } from './importers/magicItems';
import { importRules } from './importers/rules';
import { importGuides } from './importers/guides';

const DOMAINS = ['base', 'referentiels', 'equipement', 'maitrises', 'sorts', 'classes', 'races', 'historiques', 'presentation', 'pnj', 'monstres', 'objets-magiques', 'regles', 'guides'] as const;

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const edition = option('edition') ?? '2014';
  const only = option('only')?.split(',');
  const classes = option('classes')?.split(',');
  const unknown = only?.filter((d) => !(DOMAINS as readonly string[]).includes(d));
  if (unknown?.length) throw new Error(`Domaine inconnu : ${unknown.join(', ')}`);
  const run = (domain: (typeof DOMAINS)[number]) => !only || only.includes(domain);

  const prisma = createClient();
  const started = Date.now();
  try {
    if (run('base')) await importBase(prisma);
    const { id: editionId } = await prisma.edition.findUniqueOrThrow({ where: { code: edition } });
    const refs = new Refs(prisma, editionId);

    if (run('referentiels')) await importReferentiels(prisma, refs, edition);
    if (run('equipement')) await importEquipment(prisma, refs, edition);
    if (run('maitrises')) await importProficiencies(prisma, refs, edition);
    if (run('sorts')) await importSpells(prisma, refs, edition);
    let untranslated = 0;
    if (run('classes')) {
      const importer = new ClassImporter(prisma, refs, edition);
      await importer.importAll(classes);
      untranslated += importer.untranslatedChoices;
    }
    if (run('races')) untranslated += (await importRaces(prisma, refs, edition)).untranslatedChoices;
    if (run('historiques')) untranslated += (await importBackgrounds(prisma, refs, edition)).untranslatedChoices;
    // Après les classes, races et historiques, dont l'import remplace les traductions (accroches comprises)
    if (run('classes') || run('races') || run('historiques') || run('presentation')) await importPresentation(prisma, refs, edition);
    if (run('pnj') || run('races')) await importNpcGenerator(prisma, refs, edition);
    // Après les sorts et les classes (incantation des monstres), l'équipement (armures)
    if (run('monstres')) await importMonsters(prisma, refs, edition);
    if (run('objets-magiques')) await importMagicItems(prisma, refs, edition);
    if (run('regles')) await importRules(prisma, refs, edition);
    // Après les classes, races et règles, vers lesquelles renvoient les cartes
    if (run('guides')) await importGuides(prisma, refs, edition);
    if (untranslated) log(`${untranslated} description(s) de choix non traduite(s) dans les fichiers sources : repli sur l'anglais`);
    log(`terminé en ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] échec :', error);
  process.exit(1);
});
