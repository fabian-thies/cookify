<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getFavoriteRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    const userId = data.user.id;

    $effect(() => {
        getFavoriteRecipes().then((favRecipes) => {
            recipes = favRecipes as Recipe[];
        });
    });
</script>

<RecipeList {userId} {recipes} title={m["routes.favorites.title"]()}/>
