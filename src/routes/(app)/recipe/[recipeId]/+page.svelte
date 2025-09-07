<script lang="ts">
    import Preparation from "$lib/components/recipe/details/Preparation.svelte";
    import Ingredients from "$lib/components/recipe/details/Ingredients.svelte";
    import Overview from "$lib/components/recipe/details/Overview.svelte";
    import SuggestedRecipes from "$lib/components/recipe/SuggestedRecipes.svelte";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();
    const recipe = data.recipe;
</script>

<Overview {...recipe} userId={recipe.userId} />

<div class="grid lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
        <Ingredients servings={recipe.servings} ingredients={recipe.ingredients} />
    </div>
    <div class="lg:col-span-2">
        <Preparation steps={recipe.steps} />
    </div>
</div>

<SuggestedRecipes class="mt-12" title="Ähnliche Rezepte" />
