<script lang="ts">
    import RecipeCarousel from "$lib/components/recipe/widgets/RecipeCarousel.svelte";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import {Button} from "$lib/components/ui/button";
    import {getPopularRecipes, getRecentRecipes, getDiscoverRecipes, getForYouRecipes} from "$lib/functions/recipe.remote";
    import type {Recipe} from "$lib/server/db/recipe";
    import {m} from "$lib/paraglide/messages";
    import {Plus, UtensilsCrossed} from "lucide-svelte";

    let popularRecipes = $state<Recipe[]>([]);
    let recentRecipes = $state<Recipe[]>([]);
    let discoverRecipes = $state<Recipe[]>([]);
    let forYouRecipes = $state<Recipe[]>([]);
    let loading = $state(true);
    let failed = $state(false);

    async function loadRecipes() {
        loading = true;
        failed = false;

        try {
            const [popular, recent, discover, forYou] = await Promise.all([
                getPopularRecipes().run(),
                getRecentRecipes().run(),
                getDiscoverRecipes().run(),
                getForYouRecipes().run()
            ]);
            popularRecipes = popular;
            recentRecipes = recent;
            discoverRecipes = discover;
            forYouRecipes = forYou;
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        queueMicrotask(loadRecipes);
    });

    const allEmpty = $derived(!loading && forYouRecipes.length + popularRecipes.length + recentRecipes.length + discoverRecipes.length === 0);
</script>

{#if failed}
    <div class="mt-4">
        <ErrorState onRetry={loadRecipes}/>
    </div>
{:else if allEmpty}
    <div class="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-muted">
            <UtensilsCrossed class="size-5 text-muted-foreground"/>
        </div>
        <p class="font-medium">{m["recipe.list.noRecipes"]()}</p>
        <Button href="/recipe/create">
            <Plus class="size-4"/>
            {m["nav.create"]()}
        </Button>
    </div>
{:else}
    <div class="mt-4 mb-8 flex flex-col gap-8 sm:mt-8 sm:gap-14">
        {#if forYouRecipes.length > 0}
            <RecipeCarousel recipes={forYouRecipes} title={m["routes.home.forYou"]()} {loading}/>
        {/if}
        <RecipeCarousel recipes={popularRecipes} title={m["routes.home.popularRecipes"]()} {loading}/>
        <RecipeCarousel recipes={recentRecipes} title={m["routes.home.recentlyAdded"]()} {loading}/>
        {#if forYouRecipes.length === 0}
            <RecipeCarousel recipes={discoverRecipes} title={m["routes.home.discover"]()} {loading}/>
        {/if}
    </div>
{/if}
