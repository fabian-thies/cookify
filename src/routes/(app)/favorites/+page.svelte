<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";

    const { data }: PageProps = $props();

    const recipes = data.recipes;
    const difficulties = data.difficulties;
</script>

<RecipeList {recipes} {difficulties} title="Favoriten"/>