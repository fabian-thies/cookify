<script lang="ts">
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import {getPopularRecipes, getRecentRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {m} from "$lib/paraglide/messages";

    let popularRecipes = $state<Recipe[]>([]);
    let recentRecipes = $state<Recipe[]>([]);

    $effect(() => {
        Promise.all([
            getPopularRecipes(),
            getRecentRecipes()
        ]).then(([popular, recent]) => {
            popularRecipes = popular;
            recentRecipes = recent;
        });
    });
</script>

<div class="flex flex-col gap-20 p-4 sm:p-6 mt-8 mb-12">
    <RecipeCarousel recipes={popularRecipes} title={m["routes.home.popularRecipes"]()} class="animate-fade-in"/>
    <RecipeCarousel recipes={recentRecipes} title={m["routes.home.recentlyAdded"]()} class="animate-fade-in-delay"/>
</div>