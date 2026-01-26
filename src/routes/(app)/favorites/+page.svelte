<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getFavoriteRecipes, getDifficulties} from "$lib/functions/recipe.remote";
    import type {Recipe, Difficulty} from "$lib/server/db/recipe";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let difficulties = $state<Difficulty[]>([]);
    const userId = data.user.id;

    $effect(() => {
        Promise.all([
            getFavoriteRecipes(),
            getDifficulties()
        ]).then(([favRecipes, diffs]) => {
            recipes = favRecipes;
            difficulties = diffs;
        });
    });
</script>

<RecipeList {userId} {difficulties} {recipes} title={m["routes.favorites.title"]()}/>