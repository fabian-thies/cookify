<script lang="ts">
    import type {RecipePreview} from "$lib/types/recipe/recipe";
    import RecipeCard from "$lib/components/Recipe/RecipeCard.svelte";

    export let recipes: RecipePreview[] = [];
</script>

{#if recipes.length > 0}
    <section class="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 xs:grid-cols-1 gap-10 max-w-[100rem]">
        {#each recipes as recipe}
            <RecipeCard recipe={recipe}/>
        {/each}
    </section>
{:else}
    <p>Keine Rezepte gefunden</p>
{/if}