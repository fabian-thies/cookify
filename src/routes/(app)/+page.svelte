<script lang="ts">
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import {getPopularRecipes, getRecentRecipes, getDiscoverRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {m} from "$lib/paraglide/messages";

    let popularRecipes = $state<Recipe[]>([]);
    let recentRecipes = $state<Recipe[]>([]);
    let discoverRecipes = $state<Recipe[]>([]);
    let loading = $state(true);

    $effect(() => {
        loading = true;
        Promise.all([
            getPopularRecipes(),
            getRecentRecipes(),
            getDiscoverRecipes()
        ]).then(([popular, recent, discover]) => {
            popularRecipes = popular;
            recentRecipes = recent;
            discoverRecipes = discover;
            loading = false;
        });
    });
</script>

<div class="flex flex-col gap-20 p-4 sm:p-6 mt-8 mb-12 fade-stagger">
    <RecipeCarousel recipes={popularRecipes} title={m["routes.home.popularRecipes"]()} class="animate-fade-in" {loading}/>
    <RecipeCarousel recipes={recentRecipes} title={m["routes.home.recentlyAdded"]()} class="animate-fade-in" {loading}/>
    <RecipeCarousel recipes={discoverRecipes} title={m["routes.home.discover"]()} class="animate-fade-in" {loading}/>
</div>