<script>
    import Preparation from "$lib/components/recipe/details/Preparation.svelte";
    import Ingredients from "$lib/components/recipe/details/Ingredients.svelte";
    import Overview from "$lib/components/recipe/details/Overview.svelte";
    import SuggestedRecipes from "$lib/components/recipe/SuggestedRecipes.svelte";
</script>

<Overview />
<div class="grid lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
        <Ingredients />
    </div>
    <div class="lg:col-span-2">
        <Preparation />
    </div>
</div>
<SuggestedRecipes class="mt-12" title="Ähnliche Rezepte"/>
