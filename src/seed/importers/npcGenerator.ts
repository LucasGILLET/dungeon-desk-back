// Tables du générateur de PNJ (custom/npc-generator.json) : profils physiques
// des races, textes tirés au sort (professions, manies…). Les noms sont générés
// par le front. Remplacées en bloc : aucun PNJ ne les référence (il garde le texte).
import { NpcTableKind, PrismaClient } from '@prisma/client';
import { log, readJson, Refs, TX_OPTIONS } from '../context';

interface GeneratorFile {
  raceProfiles: Record<string, { npcFrequency: number; baseHeightCm: number; heightVarianceCm: number; baseWeightKg: number; weightVarianceKg: number }>;
  texts: Partial<Record<NpcTableKind, Record<string, string>[]>>;
}

export async function importNpcGenerator(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const file: GeneratorFile = readJson(`${edition}/custom/npc-generator.json`);
  const { editionId } = refs;
  const races = new Map((await prisma.race.findMany({ where: { editionId }, select: { id: true, index: true } })).map((r) => [r.index, r.id]));
  let entries = 0;

  await prisma.$transaction(async (tx) => {
    for (const [index, profile] of Object.entries(file.raceProfiles)) {
      const id = races.get(index);
      if (id) await tx.race.update({ where: { id }, data: profile });
    }

    // Entrées propres aux races de cette édition, et entrées communes
    await tx.npcTableEntry.deleteMany({ where: { OR: [{ raceId: { in: [...races.values()] } }, { raceId: null }] } });
    for (const [kind, list] of Object.entries(file.texts)) {
      for (const text of list ?? []) {
        const entry = await tx.npcTableEntry.create({ data: { kind: kind as NpcTableKind } });
        await tx.npcTableEntryTranslation.createMany({ data: Object.entries(text).map(([localeCode, t]) => ({ entryId: entry.id, localeCode, text: t })) });
        entries++;
      }
    }
  }, TX_OPTIONS);
  log(`générateur de PNJ : ${Object.keys(file.raceProfiles).length} profils de race, ${entries} entrées`);
}
