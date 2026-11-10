<script lang="ts">
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import {m} from "$lib/paraglide/messages";
    import {getSimilarRecipes} from "$lib/functions/recipe.remote";
    import {Spinner} from "$lib/components/ui/spinner";

    type Props = {
        recipeId: number;
    };

    const {recipeId}: Props = $props();

    let similarRecipes = $state<Awaited<ReturnType<typeof getSimilarRecipes>>>([]);
    let loading = $state(true);
    let error = $state(false);

    $effect(() => {
        loading = true;
        error = false;
        getSimilarRecipes({recipeId})
            .then((result) => {
                similarRecipes = result;
                loading = false;
            })
            .catch(() => {
                error = true;
                loading = false;
            });
    });
</script>

{#if loading}
    <div class="flex items-center justify-center py-8">
        <Spinner/>
    </div>
{:else if !error && similarRecipes.length > 0}
    <div class="w-full mt-10">
        <div class="space-y-2 mb-5 sm:mb-8">
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {m["recipe.common.similar"]()}
            </h2>
            <div class="h-1 w-16 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 place-items-stretch">
            {#each similarRecipes as recipe (recipe.id)}
                <RecipeCard
                    id={recipe.id}
                    title={recipe.title}
                    description={recipe.description}
                    image={recipe.image}
                    servings={recipe.servings}
                    cookingTime={recipe.cookingTime}
                    difficulty={recipe.difficulty}
                />
            {/each}
        </div>
    </div>
{/if}