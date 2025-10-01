<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import { m } from "$lib/paraglide/messages";

    const { data }: PageProps = $props();

    const recipes = data.recipes;
</script>

<RecipeList {recipes} title={m["routes.home.title"]()}/>