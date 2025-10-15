<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";

    const {data}: PageProps = $props();
</script>

<div class="container mx-auto p-2">
    <div class="flex flex-col gap-16 p-4 mt-6">
        <RecipeCarousel title="Beliebte Rezepte" recipes={data.popularRecipes}/>
        <RecipeCarousel title="Neu hinzugefügt" recipes={data.recentRecipes}/>
    </div>
</div>