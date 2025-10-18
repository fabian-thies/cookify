<script>
    import {enhance} from '$app/forms';
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";

    const {form} = $props();
</script>

<div class="container mx-auto mt-14">
    <form action="?/createRecipe" enctype="multipart/form-data" method="POST" use:enhance={() => {
        return async ({ result }) => {
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
                <Ingredients/>
                <Steps/>
            </div>

            <div class="space-y-6">
                <Details/>
                <div class="flex flex-col gap-3 mt-6">
                    <Button class="w-full" type="submit">
                        {m["actions.saveRecipe"]()}
                    </Button>
                    <Button class="w-full" href={"/"} type="button" variant="outline">
                        {m["actions.cancel"]()}
                    </Button>
                </div>
            </div>
        </div>
    </form>
</div>