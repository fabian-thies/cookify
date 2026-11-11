<script lang="ts">
    import Preparation from "$lib/components/recipe/view/Preparation.svelte";
import Tips from "$lib/components/recipe/view/Tips.svelte";
    import Ingredients from "$lib/components/recipe/view/Ingredients.svelte";
    import Overview from "$lib/components/recipe/view/Overview.svelte";
    import type {PageProps} from "./$types";
    import {getSharedRecipeDetails} from "$lib/functions/recipe.remote";
    import {page} from "$app/stores";
    import {m} from "$lib/paraglide/messages";
    import ErrorState from "$lib/components/ErrorState.svelte";

    const {data}: PageProps = $props();

    let recipe = $state<any>(null);
    let failed = $state(false);

    async function loadSharedRecipe() {
        const token = $page.params.token!;
        failed = false;

        try {
            recipe = await getSharedRecipeDetails({token, incrementView: true}).run();
        } catch (error) {
            console.error('Failed to load shared recipe:', error);
            failed = true;
        }
    }

    $effect(() => {
        $page.params.token;
        queueMicrotask(loadSharedRecipe);
    });
</script>

{#if failed}
    <div class="mt-4">
        <ErrorState message={m["actions.loadRecipeError"]()} onRetry={loadSharedRecipe}/>
    </div>
{:else if recipe}
    {#key recipe.id}
        <Overview
                {...recipe}
                recipeOwner={false}
                isFavorite={false}
                userRating={null}
                readonly={true}
                sharePath={recipe.sharePath}
        />
    {/key}
    <div class="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        <div class="lg:col-span-1">
            <Ingredients ingredients={recipe.ingredients} servings={recipe.servings}/>
        </div>
        <div class="lg:col-span-2">
            <Preparation steps={recipe.steps}/>
            <Tips tips={recipe.tips}/>
        </div>
    </div>
{:else}
    <div class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{m.loading()}</div>
    </div>
{/if}
