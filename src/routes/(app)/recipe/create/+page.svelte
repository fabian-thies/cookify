<script lang="ts">
    import {enhance} from '$app/forms';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {Spinner} from "$lib/components/ui/spinner/index.js";

    import ImportDialog from "$lib/components/recipe/import/ImportDialog.svelte";

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
        sourceUrl: string;
    };

    let ingredients = $state<{id: number | null; recipeId: number; name: string; quantity: number | null; unit: string}[]>([]);
    let steps = $state<{number: number; step: string}[]>([]);
    let tags = $state<string[]>([]);

    function handleImport(recipe: ScrapedRecipe) {
        const formEl = document.querySelector('form') as HTMLFormElement;
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
            if (normalizedDifficulty) difficultySelect.value = normalizedDifficulty;
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

        if (recipe.image) {
            fetch(recipe.image)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], 'imported-image.jpg', { type: blob.type || 'image/jpeg' });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const fileInput = formEl.querySelector('[name="picture"]') as HTMLInputElement;
                    if (fileInput) {
                        fileInput.files = dt.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                })
                .catch(() => {
                    // Silently ignore image download failures
                });
        }

        toast.success((m as any)['recipe.import.success']());
    }

    const {form} = $props();

    let creating = $state(false);
</script>

<div class="container mx-auto mt-14">
    <form action="?/createRecipe" enctype="multipart/form-data" method="POST" use:enhance={() => {
        return async ({ result }) => {
            creating = false;
            if (result.type === 'success') {
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
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6 lg:col-span-2">
                <General/>
                <Ingredients ingredients={ingredients}/>
                <Steps steps={steps}/>
            </div>

            <div class="space-y-6">
                <Details tags={tags}/>
                <div class="flex flex-col gap-3 mt-6">
                    <ImportDialog onImport={handleImport}/>
                    <Button class="w-full" type="submit" onclick={() => creating = true}>
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