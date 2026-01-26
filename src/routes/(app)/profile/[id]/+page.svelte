<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getRecipes, getDifficulties} from "$lib/functions/recipe.remote";
    import type {Recipe, Difficulty} from "$lib/server/db/recipe";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let difficulties = $state<Difficulty[]>([]);
    const user = data.user;

    $effect(() => {
        Promise.all([
            getRecipes(),
            getDifficulties()
        ]).then(([recipeData, diffData]) => {
            recipes = recipeData;
            difficulties = diffData;
        });
    });
</script>


<RecipeList userId={user.id} {recipes} showFilters={false} title={m["profile.userRecipes"]({username: user.username})}/>
