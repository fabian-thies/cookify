<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";

    const {data}: PageProps = $props();
</script>

<div class="container mx-auto p-2">
    <div class="flex flex-col gap-16 p-4 mt-6">
        <RecipeCarousel recipes={data.popularRecipes} title="Beliebte Rezepte"/>
        <RecipeCarousel recipes={data.recentRecipes} title="Neu hinzugefügt"/>
    </div>
</div>