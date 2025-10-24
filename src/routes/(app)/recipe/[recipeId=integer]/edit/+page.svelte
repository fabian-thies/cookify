<script>
    import {enhance} from '$app/forms';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {Spinner} from "$lib/components/ui/spinner/index.js";

    const {data} = $props();

    const recipe = data.recipe;
    const ingredients = recipe.ingredients;
    const steps = recipe.steps;

    let updating = $state(false);
</script>

<div class="container mx-auto mt-14">
    <form action="?/updateRecipe" enctype="multipart/form-data" method="POST" use:enhance={() => {
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
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6 lg:col-span-2">
                <General {recipe}/>
                <Ingredients {ingredients} {recipe}/>
                <Steps {steps}/>
            </div>

            <div class="space-y-6">
                <Details {recipe}/>
                <div class="flex flex-col gap-3 mt-6">
                    <Button class="w-full" type="submit" onclick={() => updating = true}>
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
</div>