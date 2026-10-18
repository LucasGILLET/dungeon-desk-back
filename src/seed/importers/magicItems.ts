// Objets magiques : la première ligne de la description du SRD ("Wondrous item,
// rare (requires attunement)") devient le sous-titre, la rareté et le lien ;
// les variantes ("Armor, +1") sont rattachées à leur objet générique.
import { MagicItemRarity, PrismaClient } from '@prisma/client';
import { Json, loadSrd, log, Refs, replaceTranslations, text, translationsFor, TX_OPTIONS } from '../context';
import { IMAGE_HOST } from './monsters';

const RARITIES: Record<string, MagicItemRarity> = {
  Common: 'COMMON', Uncommon: 'UNCOMMON', Rare: 'RARE', 'Very Rare': 'VERY_RARE', Legendary: 'LEGENDARY', Artifact: 'ARTIFACT', Varies: 'VARIES',
};

export function parseRarity(name: string): MagicItemRarity {
  const rarity = RARITIES[name];
  if (!rarity) throw new Error(`Rareté non reconnue : "${name}"`);
  return rarity;
}

export async function importMagicItems(prisma: PrismaClient, refs: Refs, edition: string): Promise<void> {
  const { editionId } = refs;
  const items = loadSrd(edition, 'Magic-Items');
  await refs.preload('equipmentCategory');
  for (const en of items.list as Json[]) {
    const data = {
      equipmentCategoryId: await refs.id('equipmentCategory', en.equipment_category.index),
      rarity: parseRarity(en.rarity.name),
      requiresAttunement: /requires attunement/i.test(en.desc[0]),
      imageUrl: en.image ? `${IMAGE_HOST}${en.image}` : null,
    };
    await prisma.$transaction(async (tx) => {
      const row = await tx.magicItem.upsert({
        where: { editionId_index: { editionId, index: en.index } },
        create: { editionId, index: en.index, ...data },
        update: data,
      });
      await replaceTranslations(tx, 'magicItemTranslation', 'magicItemId', row.id,
        translationsFor(items, en.index, (r) => ({ name: r.name, subtitle: r.desc[0] ?? null, description: text(r.desc.slice(1)) ?? '' })));
    }, TX_OPTIONS);
  }
  refs.reset('magicItem');

  // Variantes : une fois tous les objets créés
  await refs.preload('magicItem');
  let variants = 0;
  for (const en of items.list as Json[]) {
    if (!en.variants.length) continue;
    const parentId = await refs.id('magicItem', en.index);
    const ids = await Promise.all(en.variants.map((v: Json) => refs.id('magicItem', v.index)));
    await prisma.magicItem.updateMany({ where: { id: { in: ids } }, data: { parentId } });
    variants += ids.length;
  }
  log(`objets magiques : ${items.list.length} (${variants} variantes)`);
}
