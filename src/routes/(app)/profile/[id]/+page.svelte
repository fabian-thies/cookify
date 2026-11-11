<script lang="ts">
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import ErrorState from "$lib/components/ErrorState.svelte";
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
    let failed = $state(false);

    const currentUserId = data.user.id;

    let requestId = 0;

    async function loadProfile(profileId: string) {
        const run = ++requestId;
        loading = true;
        failed = false;

        try {
            const [user, recipeData] = await Promise.all([
                getUserById({userId: profileId}),
                getRecipesByUserId({userId: profileId})
            ]);
            if (run !== requestId) return;
            profileUser = user;
            recipes = recipeData;
        } catch {
            if (run !== requestId) return;
            failed = true;
        } finally {
            if (run === requestId) loading = false;
        }
    }

    $effect(() => {
        const profileId = $page.params.id;
        if (!profileId) return;
        loadProfile(profileId);
    });
</script>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <Spinner class="size-8"/>
    </div>
{:else if failed}
    <ErrorState onRetry={() => $page.params.id && loadProfile($page.params.id)}/>
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
