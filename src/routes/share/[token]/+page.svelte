<script lang="ts">
    import Preparation from "$lib/components/recipe/view/Preparation.svelte";
import Tips from "$lib/components/recipe/view/Tips.svelte";
    import Ingredients from "$lib/components/recipe/view/Ingredients.svelte";
    import Overview from "$lib/components/recipe/view/Overview.svelte";
    import type {PageProps} from "./$types";
    import {getSharedRecipeDetails} from "$lib/functions/recipe.remote";
    import {page} from "$app/stores";
    import {m} from "$lib/paraglide/messages";

    const {data}: PageProps = $props();

    let recipe = $state<any>(null);

    $effect(() => {
        const token = $page.params.token!;
        getSharedRecipeDetails({token, incrementView: true}).then((result) => {
            recipe = result;
        }).catch((error) => {
            console.error('Failed to load shared recipe:', error);
        });
    });
</script>

{#if recipe}
    {#key recipe.id}
        <Overview
                {...recipe}
                recipeOwner={false}
                isFavorite={false}
                userRating={null}
                readonly={true}
                sharePath={recipe.sharePath}
        />
    {/key}
    <div class="grid gap-4 sm:gap-8 lg:grid-cols-3">
        <div class="lg:col-span-1">
            <Ingredients ingredients={recipe.ingredients} servings={recipe.servings}/>
        </div>
        <div class="lg:col-span-2">
            <Preparation steps={recipe.steps}/>
            <Tips tips={recipe.tips}/>
        </div>
    </div>
{:else}
    <div class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{m.loading()}</div>
    </div>
{/if}
