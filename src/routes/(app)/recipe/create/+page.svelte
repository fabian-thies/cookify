<script>
    import General from "$lib/components/recipe/create/General.svelte";
    import Ingredients from "$lib/components/recipe/create/Ingredients.svelte";
    import Instructions from "$lib/components/recipe/create/Instructions.svelte";
    import Details from "$lib/components/recipe/create/Details.svelte";
    import {Button} from "$lib/components/ui/button/index.js";
</script>

<div class="container">
    <form method="POST" action="?/createRecipe">
        <General />
        <Ingredients />
        <Instructions />
        <Details />

        <div class="flex gap-3 mt-6">
            <Button type="submit">
                Rezept speichern
            </Button>
            <Button type="button" variant="outline" onclick={() => alert('Vorschau könnte hier geöffnet werden')}>
                Vorschau anzeigen
            </Button>
        </div>
    </form>
</div>