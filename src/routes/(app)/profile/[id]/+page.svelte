<script lang="ts">
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {m} from "$lib/paraglide/messages";
    import {Spinner} from "$lib/components/ui/spinner";
    import {getRecipesByUserId} from "$lib/functions/recipe.remote";
    import {getUserById} from "$lib/functions/user.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import type {PublicUser} from "$lib/server/db/schema";
    import {page} from "$app/stores";

    const {data} = $props();

    let profileUser = $state<PublicUser | null>(null);
    let recipes = $state<Recipe[]>([]);
    let loading = $state(true);

    const currentUserId = data.user.id;

    $effect(() => {
        const profileId = $page.params.id;
        if (!profileId) return;

        loading = true;

        Promise.all([
            getUserById({userId: profileId}),
            getRecipesByUserId({userId: profileId})
        ]).then(([user, recipeData]) => {
            profileUser = user;
            recipes = recipeData;
            loading = false;
        }).catch((error) => {
            console.error('Failed to load profile:', error);
            loading = false;
        });
    });
</script>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <Spinner class="size-8"/>
    </div>
{:else if profileUser}
    <RecipeList
        userId={currentUserId}
        {recipes}
        {loading}
        showFilters={false}
        title={m["profile.userRecipes"]({username: profileUser.username})}
    />
{:else}
    <div class="flex justify-center py-12">
        <p class="text-muted-foreground">{m["profile.userNotFound"]()}</p>
    </div>
{/if}
