import type {PageServerLoad} from "./$types";
import {getCollectionRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async ({params}) => {
    const collection = await getCollectionRecipes(Number(params.id));

    return {collection};
}