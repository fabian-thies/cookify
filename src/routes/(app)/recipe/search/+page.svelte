<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let loading = $state(true);
    const userId = data.user.id;

    $effect(() => {
        getRecipes().then((result) => {
            recipes = result;
            loading = false;
        });
    });
</script>

<RecipeList {userId} {recipes} title={m["routes.home.title"]()} {loading}/>