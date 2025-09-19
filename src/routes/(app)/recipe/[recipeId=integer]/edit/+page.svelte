<script>
    import {enhance} from '$app/forms';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import { m } from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";

    const {data, form} = $props();

    const recipe = data.recipe;
    const ingredients = recipe.ingredients;
    const steps = recipe.steps;
</script>

<div class="container mx-auto mt-14">
    <form method="POST" action="?/updateRecipe" enctype="multipart/form-data" use:enhance={() => {
        return async ({ result }) => {
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
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6 lg:col-span-2">
                <General {recipe}/>
                <Ingredients {recipe} {ingredients}/>
                <Steps {steps}/>
            </div>

            <div class="space-y-6">
                <Details {recipe}/>
                <div class="flex flex-col gap-3 mt-6">
                    <Button type="submit" class="w-full">
                        {m["actions.saveRecipe"]()}
                    </Button>
                    <Button type="button" class="w-full" variant="outline" onclick={() => alert('Vorschau könnte hier geöffnet werden')}>
                        {m["actions.showPreview"]()}
                    </Button>
                </div>
            </div>
        </div>
    </form>
</div>