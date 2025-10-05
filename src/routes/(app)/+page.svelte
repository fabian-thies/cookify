<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";

    const {data}: PageProps = $props();

    const recentRecipes = data.recentRecipes;
</script>

<div class="container mx-auto p-2">
    <div class="flex flex-col gap-16 p-4 mt-6">
        <RecipeCarousel title="Beliebte Rezepte" recipes={recentRecipes}/>
        <RecipeCarousel title="Schnell und Einfach" recipes={recentRecipes}/>
        <RecipeCarousel title="Neu hinzugefügt" recipes={recentRecipes}/>
    </div>
</div>