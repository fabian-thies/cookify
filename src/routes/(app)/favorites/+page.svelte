<script lang="ts">
    import type {PageProps} from "./$types";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getFavoriteRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {DEFAULT_RECIPE_SORT, type RecipeListQuery, type RecipeSortOption} from "$lib/recipe-filters";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let loading = $state(true);
    let failed = $state(false);
    const userId = $derived(data.user.id);

    let lastOrderBy: RecipeSortOption | "" = "";
    let requestVersion = 0;

    async function loadRecipes(orderBy: RecipeSortOption = DEFAULT_RECIPE_SORT) {
        const version = ++requestVersion;
        loading = true;
        failed = false;
        try {
            const result = await getFavoriteRecipes({orderBy}).run();
            if (version !== requestVersion) return;
            recipes = result as Recipe[];
        } catch {
            if (version !== requestVersion) return;
            failed = true;
        } finally {
            if (version === requestVersion) {
                loading = false;
            }
        }
    }

    function handleQueryChange(query: RecipeListQuery) {
        if (query.orderBy === lastOrderBy) return;
        lastOrderBy = query.orderBy;
        queueMicrotask(() => loadRecipes(query.orderBy));
    }

    function retryLoad() {
        lastOrderBy = "";
        failed = false;
    }
</script>

{#if failed}
    <ErrorState onRetry={retryLoad}/>
{:else}
    <RecipeList
        emptyHref="/recipe/search"
        emptyLabel={m["nav.recipes"]()}
        {userId}
        {recipes}
        title={m["routes.favorites.title"]()}
        {loading}
        onQueryChange={handleQueryChange}
    />
{/if}
