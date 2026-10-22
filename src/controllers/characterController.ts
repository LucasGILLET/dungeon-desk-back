import { Request, Response } from 'express';
import { ZodError } from 'zod';
import prisma from '../prismaClient';
import { loadRulesContext } from '../characters/context';
import { describeArmorClass, describeAttacks, describeChoices, describeFeatureResources, describeGrantedTraits, describeProficiencies, describeResources } from '../characters/describe';
import { CharacterInput, CharacterInputSchema } from '../characters/input';
import { analyse, CharacterSheet, Issue, RulesContext } from '../characters/rules';
import { CHARACTER_INCLUDE, createCharacter as insertCharacter, displayNames, findCharacter, replaceCharacter, StoredCharacter, toInput } from '../characters/store';
import { LangContext, resolveLang } from '../srd/lang';
import { logger } from '../utils/logger';

// Personnages : le client envoie toujours le personnage complet (création,
// modification, montée de niveau, inventaire) ; le serveur le valide contre
// les données de jeu avant de l'enregistrer. Voir src/characters.

const userIdOf = (req: Request): number | undefined => (req as Request & { user?: { id: number } }).user?.id;

const zodIssues = (error: ZodError): Issue[] => error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

// Valide le corps de la requête ; null (réponse 400 déjà envoyée) si invalide
async function validate(req: Request, res: Response) {
    const parsed = CharacterInputSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: 'Invalid character data', errors: zodIssues(parsed.error) });
        return null;
    }
    const analysis = analyse(parsed.data, await loadRulesContext(prisma, parsed.data));
    if (!analysis.plan) {
        res.status(400).json({ message: 'Invalid character data', errors: analysis.errors });
        return null;
    }
    return analysis.plan;
}

// Valeurs calculées de la fiche : maîtrises, ressources, CA, attaques…
async function describeSheet(ctx: RulesContext, input: CharacterInput, sheet: CharacterSheet, lang: LangContext) {
    const known = await describeProficiencies(prisma, ctx, input, lang);
    const resources = await describeResources(prisma, ctx, input, sheet);
    return {
        ...sheet,
        ...known,
        ...resources,
        armorClass: await describeArmorClass(prisma, ctx, input, sheet, lang),
        attacks: await describeAttacks(prisma, ctx, input, sheet, known, resources.spellcasting, lang),
        featureResources: await describeFeatureResources(prisma, ctx, input, sheet, lang),
        grantedTraitDetails: await describeGrantedTraits(prisma, ctx, sheet, lang),
    };
}

// Fiche complète : format d'échange, noms traduits, valeurs calculées. Les
// erreurs éventuelles (donnée de jeu modifiée depuis) sont renvoyées en warnings.
async function sheet(req: Request, character: StoredCharacter) {
    const input: CharacterInput = toInput(character);
    const ctx = await loadRulesContext(prisma, input);
    const analysis = analyse(input, ctx);
    const lang = await resolveLang(req);
    return {
        id: character.id,
        ...input,
        names: displayNames(character, lang),
        sheet: analysis.sheet && await describeSheet(ctx, input, analysis.sheet, lang),
        warnings: analysis.errors,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
    };
}

// Aperçu sans enregistrement (public, pour le créateur) : fiche calculée, erreurs,
// choix accessibles décrits et traduits, équipement de départ qui en découle.
export const previewCharacter = async (req: Request, res: Response) => {
    try {
        const parsed = CharacterInputSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: 'Invalid character data', errors: zodIssues(parsed.error) });
        const ctx = await loadRulesContext(prisma, parsed.data);
        const analysis = analyse(parsed.data, ctx);
        if (!ctx.edition) {
            return res.json({ valid: false, errors: analysis.errors, sheet: null, choices: [], startingEquipment: { items: [], currencies: {} } });
        }
        const lang = await resolveLang(req);
        const described = await describeChoices(prisma, ctx, parsed.data, analysis.availableChoices, lang);
        const known = await describeProficiencies(prisma, ctx, parsed.data, lang);
        const resources = analysis.sheet ? await describeResources(prisma, ctx, parsed.data, analysis.sheet) : {};
        res.json({ valid: !!analysis.plan, errors: analysis.errors, sheet: analysis.sheet && { ...analysis.sheet, ...known, ...resources }, ...described });
    } catch (error) {
        logger.error(`Error previewing character: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error previewing character' });
    }
};

export const createCharacter = async (req: Request, res: Response) => {
    try {
        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const plan = await validate(req, res);
        if (!plan) return;
        const id = await prisma.$transaction((tx) => insertCharacter(tx, userId, plan));
        res.status(201).json(await sheet(req, (await findCharacter(prisma, id, userId))!));
    } catch (error) {
        logger.error(`Error creating character: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error creating character' });
    }
};

export const getCharacters = async (req: Request, res: Response) => {
    try {
        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const characters = await prisma.character.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: CHARACTER_INCLUDE });
        const lang = await resolveLang(req);
        res.json(characters.map((c) => ({
            id: c.id,
            name: c.name,
            edition: c.edition.code,
            race: c.race.index,
            subrace: c.subrace?.index ?? null,
            classes: c.classes.map((cc) => ({ class: cc.class.index, subclass: cc.subclass?.index ?? null, level: cc.levels.length })),
            level: c.classes.reduce((sum, cc) => sum + cc.levels.length, 0),
            names: displayNames(c, lang),
            updatedAt: c.updatedAt,
        })));
    } catch (error) {
        logger.error(`Error fetching characters: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error fetching characters' });
    }
};

export const getCharacter = async (req: Request, res: Response) => {
    try {
        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const id = Number(req.params.id);
        const own = await findCharacter(prisma, id, userId);
        // Le MJ d'une campagne lit (sans pouvoir les modifier) les personnages de ses joueurs
        const character = own ?? await prisma.character.findFirst({
            where: { id, campaignMembers: { some: { campaign: { userId } } } },
            include: CHARACTER_INCLUDE,
        });
        if (!character) return res.status(404).json({ message: 'Character not found' });
        res.json({ ...(await sheet(req, character)), access: own ? 'OWNER' : 'GAME_MASTER' });
    } catch (error) {
        logger.error(`Error fetching character: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error fetching character' });
    }
};

export const deleteCharacter = async (req: Request, res: Response) => {
    try {
        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // deleteMany : ne supprime que si le personnage appartient à l'utilisateur
        const deleted = await prisma.character.deleteMany({ where: { id: Number(req.params.id), userId } });
        if (deleted.count === 0) return res.status(404).json({ message: 'Character not found' });
        res.json({ message: 'Character deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting character: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error deleting character' });
    }
};

export const updateCharacter = async (req: Request, res: Response) => {
    try {
        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const id = Number(req.params.id);
        const owned = await prisma.character.findFirst({ where: { id, userId }, select: { id: true } });
        if (!owned) return res.status(404).json({ message: 'Character not found' });

        const plan = await validate(req, res);
        if (!plan) return;
        await prisma.$transaction((tx) => replaceCharacter(tx, id, plan));
        res.json(await sheet(req, (await findCharacter(prisma, id, userId))!));
    } catch (error) {
        logger.error(`Error updating character: ${error instanceof Error ? error.message : error}`);
        res.status(500).json({ message: 'Error updating character' });
    }
};
