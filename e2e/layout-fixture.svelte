<script lang="ts">
    import {onMount} from "svelte";
    import type {AiRecipeResult} from "$lib/types/ai";
    import AiRecipeDialog from '$lib/components/recipe/import/AiRecipeDialog.svelte';
    import AiEditDialog from '$lib/components/recipe/import/AiEditDialog.svelte';
    import ImportDialog from '$lib/components/recipe/import/ImportDialog.svelte';
    import Overview from '$lib/components/recipe/view/Overview.svelte';
    import Ingredients from '$lib/components/recipe/view/Ingredients.svelte';

    let ready = $state(false);
    onMount(() => { ready = true; });

    const {shared = false, metadata = true}: {shared?: boolean; metadata?: boolean} = $props();
    const recipe: AiRecipeResult = {
        title: 'Zitronenpasta', description: 'Ein einfaches Rezept für jeden Tag.', image: null,
        cookTime: 15, servings: 2, difficulty: 'easy', sourceUrl: null,
        ingredients: [{name: 'Pasta', amount: 0.5, unit: 'kg'}],
        steps: ['Pasta 10 Minuten kochen.'], tags: ['Vegetarisch', 'Schnelle Küche'], tips: [],
        nutrition: {calories: 450, protein: 12, carbs: 70, fat: 14, fiber: 4}
    };
</script>

<main data-ready={ready} class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div class="mb-6 flex flex-wrap gap-2">
        <AiRecipeDialog onImport={() => {}}/>
        <AiEditDialog {recipe} onApply={() => {}}/>
        <ImportDialog onImport={() => {}}/>
    </div>
    <div data-testid="recipe-layout">
        <Overview id={1} userId="fixture" title={recipe.title} description={recipe.description}
            image="/favicon.svg" difficulty="easy" servings={2} cookingTime={15}
            isFavorite={false} recipeOwner={false} averageRating={null} ratingCount={0} userRating={null}
            readonly={shared} tags={metadata ? recipe.tags : []} {...(metadata ? recipe.nutrition : {})}/>
        <div class="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8" data-testid="recipe-body">
            <Ingredients servings={2} ingredients={[{id: 1, name: 'Pasta', quantity: 0.5, unit: 'kg'}]}/>
        </div>
    </div>
</main>
