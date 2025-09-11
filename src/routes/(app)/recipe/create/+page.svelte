<script>
    import General from "$lib/components/recipe/form/General.svelte";
    import Ingredients from "$lib/components/recipe/form/Ingredients.svelte";
    import Steps from "$lib/components/recipe/form/Steps.svelte";
    import Details from "$lib/components/recipe/form/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
    import Tags from "$lib/components/recipe/form/Tags.svelte";

    const {form} = $props();
</script>

<div class="container mx-auto mt-14">
    <form method="POST" action="?/createRecipe" enctype="multipart/form-data">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6 lg:col-span-2">
                <General/>
                <Ingredients/>
                <Steps/>
            </div>

            <div class="space-y-6">
                <Details/>
                <div class="flex flex-col gap-3 mt-6">
                    <Button type="submit" class="w-full">
                        Rezept speichern
                    </Button>
                    <Button type="button" class="w-full" variant="outline" onclick={() => alert('Vorschau könnte hier geöffnet werden')}>
                        Vorschau anzeigen
                    </Button>
                </div>
            </div>
        </div>
    </form>
</div>