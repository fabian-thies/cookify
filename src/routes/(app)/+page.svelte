<script lang="ts">
    import type {PageProps} from "./$types";
    import { m } from "$lib/paraglide/messages";
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";

    const { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-12 p-4 mt-6">
    <RecipeCarousel title="Beliebte Rezepte" recipes={data.recipes} />
    <RecipeCarousel title="Schnell und Einfach" recipes={data.recipes} />
    <RecipeCarousel title="Neu hinzugefügt" recipes={data.recipes} />
</div>