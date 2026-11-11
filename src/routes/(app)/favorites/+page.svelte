<script lang="ts">
    import type {PageProps} from "./$types";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getFavoriteRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let loading = $state(true);
    const userId = data.user.id;

    let failed = $state(false);

    async function loadRecipes() {
        loading = true;
        failed = false;
        try {
            const result = await getFavoriteRecipes().run();
            recipes = result as Recipe[];
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    $effect(() => { queueMicrotask(loadRecipes); });
</script>

{#if failed}
    <ErrorState onRetry={loadRecipes}/>
{:else}
<RecipeList emptyHref="/recipe/search" emptyLabel={m["nav.recipes"]()} {userId} {recipes} title={m["routes.favorites.title"]()} {loading}/>
{/if}
