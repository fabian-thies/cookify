<script lang="ts">
    import {goto} from "$app/navigation";
    import {page} from "$app/state";
    import CookMode from "$lib/components/recipe/view/CookMode.svelte";
    import ErrorState from "$lib/components/ErrorState.svelte";
    import {Button} from "$lib/components/ui/button";
    import {getRecipeDetails, recordRecipeCooked} from "$lib/functions/recipe.remote";
    import {getOfflineRecipe, type OfflineRecipe} from "$lib/offline-recipes";
    import {parseServings, servingsQuery} from "$lib/servings";
    import {m} from "$lib/paraglide/messages";
    import {ChefHat} from "lucide-svelte";

    let recipe = $state<Pick<OfflineRecipe, "id" | "title" | "ingredients" | "steps" | "servings"> | null>(null);
    let failed = $state(false);
    let offline = $state(false);
    let cookedRecorded = false;
    const recipeId = $derived(Number(page.params.recipeId));
    const servings = $derived(parseServings(page.url.searchParams.get('servings')));

    async function loadRecipe() {
        const id = recipeId;
        failed = false;
        offline = false;
        try {
            const result = await getRecipeDetails({recipeId: id, incrementView: false}).run();
            if (id === recipeId) recipe = result;
        } catch (error) {
            if (id !== recipeId) return;
            const saved = error instanceof TypeError ? getOfflineRecipe(id) : null;
            if (saved) {
                recipe = saved;
                offline = true;
                return;
            }
            console.error("Failed to load recipe:", error);
            failed = true;
        }
    }

    $effect(() => {
        recipeId;
        queueMicrotask(loadRecipe);
    });

    async function markCooked() {
        if (cookedRecorded || !recipe || offline) return;
        cookedRecorded = true;
        try {
            await recordRecipeCooked({recipeId: recipe.id});
        } catch (error) {
            console.error("Failed to save cooking history", error);
        }
    }

    function exitCookMode() {
        if (offline) {
            void goto(`/offline?recipe=${recipeId}${servings ? `&servings=${servings}` : ''}`);
        } else {
            void goto(`/recipe/${recipeId}${servingsQuery(servings)}`);
        }
    }
</script>

<svelte:head><title>{recipe?.title ? `${recipe.title} · Cookify` : "Cookify"}</title></svelte:head>

{#if recipe && !failed}
    {#key recipe.id}
        <CookMode {recipe} {servings} {exitCookMode} {markCooked}/>
    {/key}
{:else if failed}
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-4">
        <ErrorState message={m["actions.loadRecipeError"]()} onRetry={loadRecipe}/>
        <Button variant="outline" onclick={exitCookMode}>{m["recipe.cookMode.exit"]()}</Button>
    </div>
{:else}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div class="flex flex-col items-center gap-3">
            <ChefHat class="size-10 animate-pulse text-primary"/>
            <p class="text-muted-foreground">{m.loading()}</p>
        </div>
    </div>
{/if}
