<script lang="ts">
    import {page} from "$app/state";
    import type {PageProps} from "./$types";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {
        DEFAULT_RECIPE_PAGE_SIZE,
        DEFAULT_RECIPE_SORT,
        isCookTimeFilter,
        isDifficultyFilter,
        type RecipeListQuery
    } from "$lib/recipe-filters";
    import {toast} from "svelte-sonner";

    const {data}: PageProps = $props();

    let recipes = $state<Recipe[]>([]);
    let loading = $state(true);
    let loadingMore = $state(false);
    let hasMore = $state(false);
    let failed = $state(false);
    const userId = $derived(data.user.id);

    let activeQuery: RecipeListQuery = {
        orderBy: DEFAULT_RECIPE_SORT,
        difficulty: "",
        cookTime: "",
        tag: "",
        author: ""
    };
    let lastLoadedKey = "";
    let requestVersion = 0;

    function buildQueryArgs(query: RecipeListQuery, offset: number) {
        return {
            offset,
            limit: DEFAULT_RECIPE_PAGE_SIZE + 1,
            orderBy: query.orderBy,
            ...(isDifficultyFilter(query.difficulty) ? {difficulty: query.difficulty} : {}),
            ...(isCookTimeFilter(query.cookTime) ? {cookTime: query.cookTime} : {}),
            ...(query.tag.trim() ? {tag: query.tag.trim()} : {}),
            ...(query.author === "user" ? {author: "user" as const} : {})
        };
    }

    async function loadFirstPage(query: RecipeListQuery) {
        const version = ++requestVersion;
        activeQuery = query;
        loading = true;
        loadingMore = false;
        failed = false;

        try {
            const result = await getRecipes(buildQueryArgs(query, 0)).run();
            if (version !== requestVersion) return;
            hasMore = result.length > DEFAULT_RECIPE_PAGE_SIZE;
            recipes = hasMore ? result.slice(0, DEFAULT_RECIPE_PAGE_SIZE) : result;
        } catch {
            if (version !== requestVersion) return;
            failed = true;
        } finally {
            if (version === requestVersion) {
                loading = false;
            }
        }
    }

    async function loadMore() {
        if (loading || loadingMore || !hasMore) return;
        const version = requestVersion;
        loadingMore = true;

        try {
            const result = await getRecipes(buildQueryArgs(activeQuery, recipes.length)).run();
            if (version !== requestVersion) return;
            const nextHasMore = result.length > DEFAULT_RECIPE_PAGE_SIZE;
            const pageItems = nextHasMore ? result.slice(0, DEFAULT_RECIPE_PAGE_SIZE) : result;
            const existingIds = new Set(recipes.map((r) => r.id));
            recipes = [...recipes, ...pageItems.filter((r) => !existingIds.has(r.id))];
            hasMore = nextHasMore;
        } catch {
            if (version === requestVersion) {
                toast.error(m["actions.error"]());
            }
        } finally {
            if (version === requestVersion) {
                loadingMore = false;
            }
        }
    }

    function handleQueryChange(query: RecipeListQuery) {
        const key = JSON.stringify(query);
        if (key === lastLoadedKey) return;
        lastLoadedKey = key;
        queueMicrotask(() => loadFirstPage(query));
    }

    function retryLoad() {
        lastLoadedKey = "";
        failed = false;
    }
</script>

{#if failed}
    <ErrorState onRetry={retryLoad}/>
{:else}
    <RecipeList
        initialTag={page.url.searchParams.get("tag") ?? ""}
        {userId}
        {recipes}
        title={m["routes.home.title"]()}
        {loading}
        {hasMore}
        {loadingMore}
        onLoadMore={loadMore}
        onQueryChange={handleQueryChange}
        serverSearch
    />
{/if}
