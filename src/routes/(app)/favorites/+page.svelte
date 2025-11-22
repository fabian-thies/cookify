<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";

    const {data}: PageProps = $props();

    const recipes = data.recipes;
    const difficulties = data.difficulties;
    const userId = data.user.id;
</script>

<RecipeList {userId} {difficulties} {recipes} title={m["routes.favorites.title"]()}/>