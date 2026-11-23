<script lang="ts">
    import RecipeNote from "$lib/components/recipe/view/RecipeNote.svelte";
    import Preparation from "$lib/components/recipe/view/Preparation.svelte";
    import SimilarRecipes from "$lib/components/recipe/view/SimilarRecipes.svelte";
    import Tips from "$lib/components/recipe/view/Tips.svelte";
    import Ingredients from "$lib/components/recipe/view/Ingredients.svelte";
    import Overview from "$lib/components/recipe/view/Overview.svelte";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import {m} from "$lib/paraglide/messages";
    import type {PageProps} from "./$types";
    import {getRecipeDetails} from "$lib/functions/recipe.remote";
    import {page} from "$app/stores";
    import {getOfflineRecipe, removeOfflineRecipe, saveOfflineRecipe} from "$lib/offline-recipes";
    import {parseServings} from "$lib/servings";
    import {onMount} from "svelte";
    import {toast} from "svelte-sonner";

    const {data}: PageProps = $props();

    let recipe = $state<Awaited<ReturnType<ReturnType<typeof getRecipeDetails>["run"]>> | null>(null);
    let recipeOwner = $state(false);
    let failed = $state(false);
    let offlineReady = $state(false);
    let savedOffline = $state(false);
    let desiredServings = $state<number>();

    onMount(() => {
        if (import.meta.env.PROD && "serviceWorker" in navigator) {
            void navigator.serviceWorker.ready.then(() => offlineReady = true);
        }
    });

    async function loadRecipe() {
        const recipeId = Number($page.params.recipeId);
        failed = false;

        try {
            const result = await getRecipeDetails({recipeId, incrementView: true}).run();
            if (recipeId !== Number($page.params.recipeId)) return;
            recipe = result;
            recipeOwner = data.user!.id === result.userId;
            savedOffline = !!getOfflineRecipe(recipeId, data.user.id);
            if (savedOffline) {
                try {
                    saveOfflineRecipe(result, data.user.id);
                } catch {
                    // Keep the existing offline copy if refreshing storage fails.
                }
            }
        } catch (error) {
            if (recipeId !== Number($page.params.recipeId)) return;
            if (error instanceof TypeError && getOfflineRecipe(recipeId, data.user.id)) {
                location.replace(`/offline?recipe=${recipeId}${desiredServings ? `&servings=${desiredServings}` : ''}`);
                return;
            }
            console.error('Failed to load recipe:', error);
            failed = true;
        }
    }

    function toggleOfflineRecipe() {
        if (!recipe) return;
        try {
            if (savedOffline) {
                removeOfflineRecipe(recipe.id, data.user.id);
            } else {
                saveOfflineRecipe(recipe, data.user.id);
            }
            savedOffline = !savedOffline;
        } catch {
            toast.error(savedOffline ? m["offline.removeError"]() : m["offline.saveError"]());
        }
    }

    $effect(() => {
        $page.params.recipeId;
        queueMicrotask(loadRecipe);
    });
    $effect(() => {
        $page.params.recipeId;
        desiredServings = parseServings($page.url.searchParams.get('servings'));
    });
</script>

{#if failed}
    <div class="mt-4">
        <ErrorState message={m["actions.loadRecipeError"]()} onRetry={loadRecipe}/>
    </div>
{:else if recipe}
    {#key recipe.id}
        <Overview
            {...recipe}
            sharePath={recipe.sharePath ?? undefined}
            {recipeOwner}
            cookServings={desiredServings}
            aiEnabled={!!data.ai?.configured && !!data.ai?.enabled}
            {offlineReady}
            {savedOffline}
            onToggleOffline={toggleOfflineRecipe}
        />
    {/key}
    <div class="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        <div class="lg:col-span-1">
            <Ingredients ingredients={recipe.ingredients} servings={recipe.servings} bind:desiredServings/>
        </div>
        <div class="lg:col-span-2">
            <Preparation steps={recipe.steps}/>
            <Tips tips={recipe.tips}/>
            {#key recipe.id}<RecipeNote recipeId={recipe.id}/>{/key}
        </div>
    </div>
    <SimilarRecipes recipeId={recipe.id}/>
{:else}
    <div class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{m.loading()}</div>
    </div>
{/if}
