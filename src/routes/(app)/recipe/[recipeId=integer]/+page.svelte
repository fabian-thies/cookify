<script lang="ts">
    import Preparation from "$lib/components/recipe/view/Preparation.svelte";
    import Ingredients from "$lib/components/recipe/view/Ingredients.svelte";
    import Overview from "$lib/components/recipe/view/Overview.svelte";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import {m} from "$lib/paraglide/messages";
    import type {PageProps} from "./$types";

    const {data}: PageProps = $props();
    const recipe = data.recipe;

    const recipeOwner = data.user!.id === recipe.userId;
</script>

<Overview {...recipe} recipeOwner={recipeOwner}/>
<div class="grid lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
        <Ingredients ingredients={recipe.ingredients} servings={recipe.servings}/>
    </div>
    <div class="lg:col-span-2">
        <Preparation steps={recipe.steps}/>
    </div>
</div>

<RecipeCarousel class="mt-12" title={m["recipe.common.similar"]()}/>
