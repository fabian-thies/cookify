import type {PageServerLoad} from "./$types";
import {error} from '@sveltejs/kit';
import {getCollectionRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async ({params}) => {
    const collectionId = Number(params.id);

    try {
        const collection = await getCollectionRecipes(Number(collectionId));

        return {collection: {...collection, id: collectionId}};
    } catch (err) {
        error(404, "Collection not found");
    }
}