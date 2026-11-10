<script lang="ts">
    import Preparation from "$lib/components/recipe/view/Preparation.svelte";
    import SimilarRecipes from "$lib/components/recipe/view/SimilarRecipes.svelte";
import Tips from "$lib/components/recipe/view/Tips.svelte";
    import Ingredients from "$lib/components/recipe/view/Ingredients.svelte";
    import Overview from "$lib/components/recipe/view/Overview.svelte";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import {m} from "$lib/paraglide/messages";
    import type {PageProps} from "./$types";
    import {getRecipeDetails} from "$lib/functions/recipe.remote";
    import {page} from "$app/stores";

    const {data}: PageProps = $props();

    let recipe = $state<any>(null);
    let recipeOwner = $state(false);

    $effect(() => {
        const recipeId = Number($page.params.recipeId);
        getRecipeDetails({recipeId, incrementView: true}).then((result) => {
            recipe = result;
            recipeOwner = data.user!.id === result.userId;
        }).catch((error) => {
            console.error('Failed to load recipe:', error);
        });
    });
</script>

{#if recipe}
    {#key recipe.id}
        <Overview {...recipe} {recipeOwner} aiEnabled={!!data.ai?.configured && !!data.ai?.enabled}/>
    {/key}
    <div class="grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
            <Ingredients ingredients={recipe.ingredients} servings={recipe.servings}/>
        </div>
        <div class="lg:col-span-2">
            <Preparation steps={recipe.steps}/>
            <Tips tips={recipe.tips}/>
        </div>
    </div>
    <SimilarRecipes recipeId={recipe.id}/>
{:else}
    <div class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{m.loading()}</div>
    </div>
{/if}