<script lang="ts">
    import {onMount} from "svelte";
    import type {PageProps} from "./$types";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import RecipeCardSkeleton from "$lib/components/recipe/widgets/RecipeCardSkeleton.svelte";
    import {Button} from "$lib/components/ui/button";
    import {getMealPlan} from "$lib/functions/meal-plan.remote";
    import {getFavoriteRecipes, getRecipesByUserId} from "$lib/functions/recipe.remote";
    import {imageVariantUrl} from "$lib/images";
    import {m} from "$lib/paraglide/messages";
    import {getLocale} from "$lib/paraglide/runtime.js";
    import {servingsQuery} from "$lib/servings";
    import {ChevronRight, Plus, Search, UtensilsCrossed} from "lucide-svelte";

    type MealPlan = Awaited<ReturnType<typeof getMealPlan>>;
    type RecentRecipes = Awaited<ReturnType<typeof getRecipesByUserId>>;
    type Favorites = Awaited<ReturnType<typeof getFavoriteRecipes>>;
    type RecipePreview = {id: number; title: string; image: string; cookingTime: number};

    const {data}: PageProps = $props();
    let meals = $state<Promise<MealPlan>>();
    let recent = $state<Promise<RecentRecipes>>();
    let favorites = $state<Promise<Favorites>>();
    let planDate: string;

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

    function refreshDate() {
        if (planDate !== localDate()) loadMeals();
    }

    onMount(() => {
        queueMicrotask(() => {
            loadMeals();
            loadRecent();
            loadFavorites();
        });
    });
</script>

<svelte:window onfocus={refreshDate}/>

{#snippet recipeRow(recipe: RecipePreview, href: string, detail?: string)}
    <li>
        <a
            class="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-1.5 outline-offset-2 transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
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
            <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true"/>
        </a>
    </li>
{/snippet}

{#snippet loading()}
    <p role="status" class="py-2 text-sm text-muted-foreground">{m.loading()}</p>
{/snippet}

{#snippet recentSkeleton()}
    <div class="grid gap-4 min-[480px]:grid-cols-2" role="status">
        <span class="sr-only">{m.loading()}</span>
        <RecipeCardSkeleton/>
        <RecipeCardSkeleton/>
    </div>
{/snippet}

<svelte:head>
    <title>{m["routes.home.cookbook"]()} · Cookify</title>
</svelte:head>

<div class="flex flex-col gap-7 pb-5 sm:gap-10">
    <header class="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
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

    <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
        <div class="grid gap-7 sm:grid-cols-2 lg:grid-cols-1">
            <section aria-labelledby="today-meals" class="min-w-0">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3">
                    <h2 id="today-meals" class="section-title">{m["routes.home.todayPlanned"]()}</h2>
                    <Button href="/meal-plan" variant="ghost" size="sm" class="min-h-11 px-2 text-primary">
                        {m["nav.mealPlan"]()}
                        <ChevronRight class="size-4" aria-hidden="true"/>
                    </Button>
                </div>
                {#await meals}
                    {@render loading()}
                {:then entries}
                    {#if entries?.length}
                        <ul class="divide-y divide-border/60">
                            {#each entries as entry (entry.id)}
                                {@const href = `/recipe/${entry.recipe.id}${servingsQuery(entry.servings ?? undefined)}`}
                                {@const count = entry.servings ?? entry.recipe.servings}
                                {@render recipeRow(entry.recipe, href, m["recipe.common.servingsCount"]({count}))}
                            {/each}
                        </ul>
                    {:else if entries}
                        <p class="py-2 text-sm text-muted-foreground">{m["routes.home.noMealsToday"]()}</p>
                    {:else}
                        {@render loading()}
                    {/if}
                {:catch}
                    <ErrorState onRetry={loadMeals}/>
                {/await}
            </section>

            <section aria-labelledby="cookbook-favorites" class="min-w-0">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3">
                    <h2 id="cookbook-favorites" class="section-title">{m["routes.favorites.title"]()}</h2>
                    <Button href="/favorites" variant="ghost" size="sm" class="min-h-11 px-2 text-primary">
                        {m["routes.home.allFavorites"]()}
                        <ChevronRight class="size-4" aria-hidden="true"/>
                    </Button>
                </div>
                {#await favorites}
                    {@render loading()}
                {:then recipes}
                    {#if recipes?.length}
                        <ul class="divide-y divide-border/60">
                            {#each recipes as recipe (recipe.id)}
                                {@render recipeRow(recipe, `/recipe/${recipe.id}`)}
                            {/each}
                        </ul>
                    {:else if recipes}
                        <p class="py-2 text-sm text-muted-foreground">{m["routes.home.noFavorites"]()}</p>
                    {:else}
                        {@render loading()}
                    {/if}
                {:catch}
                    <ErrorState onRetry={loadFavorites}/>
                {/await}
            </section>
        </div>

        <section aria-labelledby="recent-recipes" class="min-w-0">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3">
                <h2 id="recent-recipes" class="section-title">{m["routes.home.recentlyAdded"]()}</h2>
                <Button href={`/profile/${data.user.id}`} variant="ghost" size="sm" class="min-h-11 px-2 text-primary">
                    {m["routes.home.allOwnRecipes"]()}
                    <ChevronRight class="size-4" aria-hidden="true"/>
                </Button>
            </div>
            {#await recent}
                {@render recentSkeleton()}
            {:then recipes}
                {#if recipes?.length}
                    <div class="grid gap-4 min-[480px]:grid-cols-2">
                        {#each recipes as recipe (recipe.id)}
                            <RecipeCard {...recipe}/>
                        {/each}
                    </div>
                {:else if recipes}
                    <p class="py-2 text-sm text-muted-foreground">{m["recipe.list.noRecipes"]()}</p>
                {:else}
                    {@render recentSkeleton()}
                {/if}
            {:catch}
                <ErrorState onRetry={loadRecent}/>
            {/await}
        </section>
    </div>
</div>
