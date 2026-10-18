// Tables du générateur de PNJ (custom/npc-generator.json) : profils physiques
// des races, prénoms et noms par race, textes tirés au sort (professions,
// manies…). Remplacées en bloc : aucun PNJ ne les référence (il garde le texte).
import { NpcTableKind, PrismaClient } from '@prisma/client';
import { log, readJson, Refs, TX_OPTIONS } from '../context';

interface GeneratorFile {
  raceProfiles: Record<string, { npcFrequency: number; baseHeightCm: number; heightVarianceCm: number; baseWeightKg: number; weightVarianceKg: number }>;
  names: Record<string, { first: string[]; last: string[] }>;
  common: Partial<Record<NpcTableKind, string[]>>;
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
    const values: { kind: NpcTableKind; raceId: number | null; value: string }[] = [];
    for (const [index, names] of Object.entries(file.names)) {
      const raceId = races.get(index);
      if (!raceId) continue;
      for (const value of names.first) values.push({ kind: 'FIRST_NAME', raceId, value });
      for (const value of names.last) values.push({ kind: 'LAST_NAME', raceId, value });
    }
    for (const [kind, list] of Object.entries(file.common)) {
      for (const value of list ?? []) values.push({ kind: kind as NpcTableKind, raceId: null, value });
    }
    await tx.npcTableEntry.createMany({ data: values });
    entries += values.length;

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
