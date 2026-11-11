<script lang="ts">
    import {enhance} from '$app/forms';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Tips from "$lib/components/recipe/form/Tips.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto} from "$app/navigation";
    import {tick} from "svelte";
    import {toast} from "svelte-sonner";
    import {Spinner} from "$lib/components/ui/spinner/index.js";
    import {getRecipeForEdit} from "$lib/functions/recipe.remote";
    import {page} from "$app/stores";
    import type {Ingredient, Step, Tip} from "$lib/server/db/schema";
    import type {AiRecipeResult} from "$lib/types/ai";
    import AiEditDialog from "$lib/components/recipe/import/AiEditDialog.svelte";

    // The remote query's inferred return type collapses to never in svelte-check.
    type RecipeData = any;

    const {data} = $props();
    const aiEnabled = $derived(!!data.ai?.configured && !!data.ai?.enabled);

    let recipe: RecipeData | null = $state(null);
    let ingredients = $state<Ingredient[]>([]);
    let steps = $state<Step[]>([]);
    let tips = $state<Tip[]>([]);
    let updating = $state(false);
    let loading = $state(true);
    let version = $state(0);

    const aiRecipe = $derived(recipe ? {
        title: recipe.title,
        description: recipe.description,
        image: recipe.image,
        cookTime: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        ingredients: ingredients.map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.quantity ?? 1,
            unit: ingredient.unit
        })),
        steps: steps.map((step) => step.step),
        tags: (recipe.tags ?? []).map((tag: { name: string }) => tag.name),
        tips: tips.map((tip) => tip.tip),
        nutrition: {
            calories: recipe.calories ?? null,
            protein: recipe.protein ?? null,
            carbs: recipe.carbs ?? null,
            fat: recipe.fat ?? null,
            fiber: recipe.fiber ?? null
        },
        sourceUrl: null
    } : null);

    async function applyAiRecipe(result: AiRecipeResult) {
        if (!recipe) return;

        const recipeId = recipe.id;
        const formEl = document.querySelector('form[enctype="multipart/form-data"]');
        const visibilityInput = formEl?.querySelector('[name="visibility"]') as HTMLInputElement | null;
        const pictureInput = formEl?.querySelector('[name="picture"]') as HTMLInputElement | null;
        const selectedFiles = pictureInput?.files ? Array.from(pictureInput.files) : [];
        recipe = {
            ...recipe,
            title: result.title,
            description: result.description,
            cookingTime: result.cookTime,
            servings: result.servings,
            difficulty: result.difficulty,
            visibility: visibilityInput?.value === "private" ? "private" : recipe.visibility,
            calories: result.nutrition?.calories ?? null,
            protein: result.nutrition?.protein ?? null,
            carbs: result.nutrition?.carbs ?? null,
            fat: result.nutrition?.fat ?? null,
            fiber: result.nutrition?.fiber ?? null,
            tags: result.tags.map((name, index) => ({id: index, recipeId, name}))
        };

        ingredients = result.ingredients.map((ingredient) => ({
            id: 0,
            recipeId,
            name: ingredient.name,
            quantity: ingredient.amount,
            unit: ingredient.unit
        }));
        steps = result.steps.map((step, index) => ({
            id: 0,
            recipeId,
            step,
            number: index + 1
        }));
        tips = result.tips.map((tip) => ({
            id: 0,
            recipeId,
            tip
        }));
        version += 1;
        await tick();

        if (selectedFiles.length > 0) {
            const newInput = document.querySelector('form[enctype="multipart/form-data"] [name="picture"]') as HTMLInputElement | null;
            if (newInput) {
                const dataTransfer = new DataTransfer();
                for (const file of selectedFiles) {
                    dataTransfer.items.add(file);
                }
                newInput.files = dataTransfer.files;
                newInput.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }
    }

    $effect(() => {
        const recipeId = Number($page.params.recipeId);
        getRecipeForEdit({recipeId}).then((result) => {
            recipe = result;
            ingredients = result.ingredients;
            steps = result.steps;
            tips = result.tips;
            loading = false;
        }).catch((error) => {
            console.error('Failed to load recipe:', error);
            toast.error(m["actions.loadRecipeError"]());
        });
    });
</script>

<div class="mx-auto mt-2 sm:mt-6">
    <div class="mb-5 space-y-1">
        <h1 class="page-title">{m["recipe.form.editTitle"]()}</h1>
    </div>
    {#if loading}
        <div class="flex items-center justify-center py-12">
            <div class="text-muted-foreground">{m.loading()}</div>
        </div>
    {:else if recipe}
        {#key version}
        <form action="?/updateRecipe" enctype="multipart/form-data" method="POST" use:enhance={() => {
            updating = true;
            return async ({ result }) => {
                updating = false;
                if (result.type === 'success') {
                    const recipeId = result.data?.id;

                    toast.success(m["recipe.saveSuccess"]());

                    if (recipeId) {
                        await goto(`/recipe/${recipeId}`);
                    }
                } else {
                    toast.error(m["recipe.saveError"]());
                }
            }}
        }>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
                <div class="space-y-5 lg:col-span-2 lg:space-y-6">
                    <General {recipe}/>
                    <Ingredients {ingredients} {recipe}/>
                    <Steps {steps}/>
                    <Tips {tips}/>
                </div>

                <div class="space-y-5 lg:space-y-6">
                    <Details {recipe}/>
                    <div class="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2 rounded-xl border border-border/70 bg-card/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
                        {#if aiEnabled && aiRecipe}
                            <AiEditDialog recipe={aiRecipe} onApply={applyAiRecipe}/>
                        {/if}
                        <Button class="w-full" type="submit">
                            {#if updating}
                                <Spinner/>
                            {:else}
                                {m["actions.saveRecipe"]()}
                            {/if}
                        </Button>
                        <Button class="w-full" href={"/recipe/" + recipe.id} type="button" variant="outline">
                            {m["actions.cancel"]()}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
        {/key}
    {/if}
</div>
