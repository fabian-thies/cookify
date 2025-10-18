<script lang="ts">
    import type {PageProps} from "./$types";
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";


    const {data}: PageProps = $props();

    const recipes = data.recipes;
    const difficulties = data.difficulties ?? [];
    const user = data.user;
</script>


<RecipeList {difficulties} {recipes} showFilters={false} title={m["profile.userRecipes"]({username: user.username})}/>
