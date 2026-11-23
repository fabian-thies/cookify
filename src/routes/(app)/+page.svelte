<script lang="ts">
    import {onMount} from "svelte";
    import type {PageProps} from "./$types";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import RecipeCardSkeleton from "$lib/components/recipe/widgets/RecipeCardSkeleton.svelte";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import {Button} from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import {Spinner} from "$lib/components/ui/spinner";
    import {getMealPlan} from "$lib/functions/meal-plan.remote";
    import {
        getDiscoverRecipes,
        getFavoriteRecipes,
        getForYouRecipes,
        getPopularRecipes,
        getRecipesByUserId
    } from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {imageVariantUrl} from "$lib/images";
    import {m} from "$lib/paraglide/messages";
    import {getLocale} from "$lib/paraglide/runtime.js";
    import {servingsQuery} from "$lib/servings";
    import {CalendarDays, ChevronRight, Heart, Plus, Search, UtensilsCrossed} from "lucide-svelte";

    type MealPlan = Awaited<ReturnType<typeof getMealPlan>>;
    type RecentRecipes = Awaited<ReturnType<typeof getRecipesByUserId>>;
    type Favorites = Awaited<ReturnType<typeof getFavoriteRecipes>>;
    type DiscoveryFeeds = {forYou: Recipe[]; popular: Recipe[]; discover: Recipe[]};
    type RecipePreview = {id: number; title: string; image: string; cookingTime: number};

    const {data}: PageProps = $props();
    let meals = $state<Promise<MealPlan>>();
    let recent = $state<Promise<RecentRecipes>>();
    let favorites = $state<Promise<Favorites>>();
    let discovery = $state<Promise<DiscoveryFeeds>>();
    let planDate: string | undefined;

    function localDate(): string {
        const date = new Date();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    function loadMeals() {
        planDate = localDate();
        meals = getMealPlan({startDate: planDate, endDate: planDate}).run();
    }

    function loadRecent() {
        recent = getRecipesByUserId({userId: data.user.id}).run().then((recipes) => [...recipes]
            .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime() || second.id - first.id)
            .slice(0, 4));
    }

    function loadFavorites() {
        favorites = getFavoriteRecipes().run().then((recipes) => [...recipes]
            .sort((first, second) => first.title.localeCompare(second.title, getLocale()) || first.id - second.id)
            .slice(0, 4));
    }

    function loadDiscovery() {
        discovery = Promise.all([
            getForYouRecipes().run(),
            getPopularRecipes().run(),
            getDiscoverRecipes().run()
        ]).then(([forYou, popular, discover]) => ({forYou, popular, discover}));
    }

    function refreshDate() {
        if (planDate && planDate !== localDate()) loadMeals();
    }

    onMount(() => {
        planDate = localDate();
        queueMicrotask(() => {
            loadMeals();
            loadRecent();
            loadFavorites();
            loadDiscovery();
        });
    });
</script>

<svelte:window onfocus={refreshDate}/>

{#snippet recipeRow(recipe: RecipePreview, href: string, detail?: string)}
    <li class="py-1 first:pt-0 last:pb-0">
        <a
            class="group -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
            {href}
        >
            <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                {#if recipe.image}
                    <img class="size-full object-cover" src={imageVariantUrl(recipe.image, "thumb")} alt="" loading="lazy" decoding="async"/>
                {:else}
                    <UtensilsCrossed class="size-4" aria-hidden="true"/>
                {/if}
            </div>
            <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{recipe.title}</p>
                <p class="text-xs text-muted-foreground">{detail ?? m["recipe.common.duration"]({count: recipe.cookingTime})}</p>
            </div>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true"/>
        </a>
    </li>
{/snippet}

{#snippet loadingState()}
    <div role="status" class="flex items-center justify-center py-6">
        <Spinner/>
        <span class="sr-only">{m.loading()}</span>
    </div>
{/snippet}

{#snippet recentSkeleton()}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" role="status">
        <span class="sr-only">{m.loading()}</span>
        {#each Array(4) as _}
            <RecipeCardSkeleton/>
        {/each}
    </div>
{/snippet}

<svelte:head>
    <title>{m["routes.home.cookbook"]()} · Cookify</title>
</svelte:head>

<div class="mt-2 flex flex-col gap-6 sm:gap-8">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="page-title">{m["routes.home.cookbook"]()}</h1>
        <div class="flex flex-wrap items-center gap-2">
            <Button href="/recipe/search" variant="outline" class="min-h-11">
                <Search class="size-4" aria-hidden="true"/>
                {m["recipe.list.searchPlaceholder"]()}
            </Button>
            <Button href="/recipe/create" class="min-h-11">
                <Plus class="size-4" aria-hidden="true"/>
                {m["nav.create"]()}
            </Button>
        </div>
    </header>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
        <div class="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-1">
            <section aria-labelledby="today-meals" class="min-w-0">
                <Card.Root class="w-full">
                    <Card.Header class="flex flex-row items-center justify-between gap-2 border-b border-border/60 pb-4">
                        <h2 id="today-meals" class="flex items-center gap-2 text-base font-semibold">
                            <CalendarDays class="size-4 shrink-0 text-primary" aria-hidden="true"/>
                            {m["routes.home.todayPlanned"]()}
                        </h2>
                        <Button href="/meal-plan" variant="ghost" size="sm" class="px-2 text-primary">
                            {m["nav.mealPlan"]()}
                            <ChevronRight class="size-4" aria-hidden="true"/>
                        </Button>
                    </Card.Header>
                    <Card.Content>
                        {#await meals}
                            {@render loadingState()}
                        {:then entries}
                            {#if entries?.length}
                                <ul class="divide-y divide-border/50">
                                    {#each entries as entry (entry.id)}
                                        {@const href = `/recipe/${entry.recipe.id}${servingsQuery(entry.servings ?? undefined)}`}
                                        {@const count = entry.servings ?? entry.recipe.servings}
                                        {@render recipeRow(entry.recipe, href, m["recipe.common.servingsCount"]({count}))}
                                    {/each}
                                </ul>
                            {:else if entries}
                                <p class="py-4 text-center text-sm text-muted-foreground">{m["routes.home.noMealsToday"]()}</p>
                            {:else}
                                {@render loadingState()}
                            {/if}
                        {:catch}
                            <ErrorState onRetry={loadMeals}/>
                        {/await}
                    </Card.Content>
                </Card.Root>
            </section>

            <section aria-labelledby="cookbook-favorites" class="min-w-0">
                <Card.Root class="w-full">
                    <Card.Header class="flex flex-row items-center justify-between gap-2 border-b border-border/60 pb-4">
                        <h2 id="cookbook-favorites" class="flex items-center gap-2 text-base font-semibold">
                            <Heart class="size-4 shrink-0 text-primary" aria-hidden="true"/>
                            {m["routes.favorites.title"]()}
                        </h2>
                        <Button href="/favorites" variant="ghost" size="sm" class="px-2 text-primary">
                            {m["routes.home.allFavorites"]()}
                            <ChevronRight class="size-4" aria-hidden="true"/>
                        </Button>
                    </Card.Header>
                    <Card.Content>
                        {#await favorites}
                            {@render loadingState()}
                        {:then recipes}
                            {#if recipes?.length}
                                <ul class="divide-y divide-border/50">
                                    {#each recipes as recipe (recipe.id)}
                                        {@render recipeRow(recipe, `/recipe/${recipe.id}`)}
                                    {/each}
                                </ul>
                            {:else if recipes}
                                <p class="py-4 text-center text-sm text-muted-foreground">{m["routes.home.noFavorites"]()}</p>
                            {:else}
                                {@render loadingState()}
                            {/if}
                        {:catch}
                            <ErrorState onRetry={loadFavorites}/>
                        {/await}
                    </Card.Content>
                </Card.Root>
            </section>
        </div>

        <section aria-labelledby="recent-recipes" class="min-w-0">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-x-3">
                <h2 id="recent-recipes" class="section-title">{m["routes.home.recentlyAdded"]()}</h2>
                <Button href={`/profile/${data.user.id}`} variant="ghost" size="sm" class="px-2 text-primary">
                    {m["routes.home.allOwnRecipes"]()}
                    <ChevronRight class="size-4" aria-hidden="true"/>
                </Button>
            </div>
            {#await recent}
                {@render recentSkeleton()}
            {:then recipes}
                {#if recipes?.length}
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {#each recipes as recipe (recipe.id)}
                            <RecipeCard {...recipe}/>
                        {/each}
                    </div>
                {:else if recipes}
                    <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
                        <div class="flex size-12 items-center justify-center rounded-full bg-muted">
                            <UtensilsCrossed class="size-5 text-muted-foreground" aria-hidden="true"/>
                        </div>
                        <p class="text-sm text-muted-foreground">{m["recipe.list.noRecipes"]()}</p>
                        <Button href="/recipe/create" size="sm" variant="outline">
                            <Plus class="size-4" aria-hidden="true"/>
                            {m["nav.create"]()}
                        </Button>
                    </div>
                {:else}
                    {@render recentSkeleton()}
                {/if}
            {:catch}
                <ErrorState onRetry={loadRecent}/>
            {/await}
        </section>
    </div>

    {#await discovery}
        <div class="mt-2 flex flex-col gap-8 border-t border-border/60 pt-8 sm:gap-12 sm:pt-10">
            <RecipeCarousel recipes={[]} title={m["routes.home.discover"]()} loading/>
        </div>
    {:then feeds}
        {#if feeds && (feeds.forYou.length > 0 || feeds.popular.length > 0 || feeds.discover.length > 0)}
            <div class="mt-2 flex flex-col gap-8 border-t border-border/60 pt-8 sm:gap-12 sm:pt-10">
                {#if feeds.forYou.length > 0}
                    <RecipeCarousel recipes={feeds.forYou} title={m["routes.home.forYou"]()}/>
                {/if}
                {#if feeds.popular.length > 0}
                    <RecipeCarousel recipes={feeds.popular} title={m["routes.home.popularRecipes"]()}/>
                {/if}
                {#if feeds.discover.length > 0}
                    <RecipeCarousel recipes={feeds.discover} title={m["routes.home.discover"]()}/>
                {/if}
            </div>
        {/if}
    {:catch}
        <div class="mt-2 border-t border-border/60 pt-8 sm:pt-10">
            <ErrorState onRetry={loadDiscovery}/>
        </div>
    {/await}
</div>
