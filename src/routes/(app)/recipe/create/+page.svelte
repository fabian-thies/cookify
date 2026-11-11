<script lang="ts">
    import {enhance} from '$app/forms';
    import UnsavedChanges from '$lib/components/recipe/form/UnsavedChanges.svelte';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Tips from "$lib/components/recipe/form/Tips.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {Spinner} from "$lib/components/ui/spinner/index.js";

    import ImportDialog from "$lib/components/recipe/import/ImportDialog.svelte";
    import AiRecipeDialog from "$lib/components/recipe/import/AiRecipeDialog.svelte";

    let formElement = $state<HTMLFormElement>();
    let saved = $state(false);

    const {form, data} = $props();
    const aiEnabled = $derived(!!data.ai?.configured && !!data.ai?.enabled);

    type ScrapedRecipe = {
        title: string;
        description: string;
        image: string | null;
        cookTime: number | null;
        servings: number | null;
        difficulty: string | null;
        ingredients: { name: string; amount: number | null; unit: string }[];
        steps: string[];
        tags: string[];
        tips?: string[];
        nutrition?: {
            calories: number | null;
            protein: number | null;
            carbs: number | null;
            fat: number | null;
            fiber: number | null;
        } | null;
        sourceUrl?: string | null;
    };

    let ingredients = $state<{id: number | null; recipeId: number; name: string; quantity: number | null; unit: string}[]>([]);
    let steps = $state<{number: number; step: string}[]>([]);
    let tags = $state<string[]>([]);
    let difficulty = $state<string>();
    let tips = $state<{id: number | null; recipeId: number; tip: string}[]>([]);

    async function handleImport(recipe: ScrapedRecipe) {
        const formEl = document.querySelector('form[enctype="multipart/form-data"]') as HTMLFormElement;
        if (!formEl) return;

        const titleInput = formEl.querySelector('[name="title"]') as HTMLInputElement;
        if (titleInput && recipe.title) titleInput.value = recipe.title;

        const descInput = formEl.querySelector('[name="description"]') as HTMLInputElement;
        if (descInput && recipe.description) descInput.value = recipe.description;

        const cookTimeInput = formEl.querySelector('[name="cookTime"]') as HTMLInputElement;
        if (cookTimeInput && recipe.cookTime) cookTimeInput.value = String(recipe.cookTime);

        const servingsInput = formEl.querySelector('[name="servings"]') as HTMLInputElement;
        if (servingsInput && recipe.servings) servingsInput.value = String(recipe.servings);

        const difficultySelect = formEl.querySelector('[name="difficulty"]') as HTMLSelectElement;
        if (difficultySelect && recipe.difficulty) {
            const validDifficulties = ['easy', 'medium', 'hard'];
            const normalizedDifficulty = validDifficulties.find(d => recipe.difficulty?.toLowerCase().includes(d));
            if (normalizedDifficulty) difficulty = normalizedDifficulty;
        }

        if (recipe.ingredients.length > 0) {
            ingredients = recipe.ingredients.map((ing) => ({
                id: null,
                recipeId: 0,
                name: ing.name,
                quantity: ing.amount,
                unit: ing.unit
            }));
        }

        if (recipe.steps.length > 0) {
            steps = recipe.steps.map((step, i) => ({
                number: i + 1,
                step
            }));
        }

        if (recipe.tags.length > 0) {
            tags = [...recipe.tags];
        }

        if (recipe.tips && recipe.tips.length > 0) {
            tips = recipe.tips.map((tip) => ({
                id: null,
                recipeId: 0,
                tip
            }));
        }

        if (recipe.nutrition) {
            for (const key of ["calories", "protein", "carbs", "fat", "fiber"] as const) {
                const value = recipe.nutrition[key];
                const input = formEl.querySelector(`[name="${key}"]`) as HTMLInputElement;
                if (input && value != null) input.value = String(value);
            }
        }

        if (recipe.image) {
            try {
                const res = await fetch(recipe.image);
                const blob = await res.blob();
                const file = new File([blob], 'imported-image.jpg', {type: blob.type || 'image/jpeg'});
                const dt = new DataTransfer();
                dt.items.add(file);
                const fileInput = formEl.querySelector('[name="picture"]') as HTMLInputElement;
                if (fileInput) {
                    fileInput.files = dt.files;
                    fileInput.dispatchEvent(new Event('change', {bubbles: true}));
                }
            } catch {
                // Silently ignore image download failures
            }
        }
    }

    let creating = $state(false);
</script>

<UnsavedChanges form={formElement} {saved}/>

<div class="mx-auto mt-2 sm:mt-6">
    <div class="mb-5 space-y-1">
        <h1 class="page-title">{m["recipe.form.createTitle"]()}</h1>
    </div>
    <form bind:this={formElement} action="?/createRecipe" enctype="multipart/form-data" method="POST" use:enhance={() => {
        creating = true;
        return async ({ result }) => {
            creating = false;
            if (result.type === 'success') {
                saved = true;
                const recipeId = result.data?.id;

                toast.success(m["recipe.createSuccess"]());

                if (recipeId) {
                    await goto(`/recipe/${recipeId}`);
                }

            } else {
                toast.error(m["recipe.createError"]());
            }
        }}
    }>
        <div class="mb-5 grid gap-2 sm:grid-cols-2">
            <ImportDialog onImport={handleImport}/>
            {#if aiEnabled}<AiRecipeDialog onImport={handleImport}/>{/if}
        </div>
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
            <div class="space-y-5 lg:col-span-2 lg:space-y-6">
                <General/>
                <Ingredients ingredients={ingredients}/>
                <Steps steps={steps}/>
                <Tips tips={tips}/>
            </div>

            <div class="space-y-5 lg:space-y-6">
                <Details tags={tags} {difficulty}/>
                <div class="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
                    <Button class="w-full" disabled={creating} aria-busy={creating} type="submit">
                        {#if creating}
                            <Spinner/>
                        {:else}
                            {m["actions.saveRecipe"]()}
                        {/if}
                    </Button>
                    <Button class="w-full" href={"/"} type="button" variant="outline">
                        {m["actions.cancel"]()}
                    </Button>
                </div>
            </div>
        </div>
    </form>
</div>