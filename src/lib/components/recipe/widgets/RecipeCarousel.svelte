<script lang="ts">
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import * as Carousel from "$lib/components/ui/carousel";
    import type {HTMLAttributes} from "svelte/elements";
    import type {ComponentProps} from "svelte";
    import type {Recipe} from "$lib/server/db/recipe";
    import {m} from "$lib/paraglide/messages";

    type Props = {
        title: string;
        class?: string;
        recipes: Recipe[];
    }

    const {class: className, title, recipes}: Props = $props();
</script>

<div class={`w-full px-4 ${className}`}>
    <div class="space-y-2 mb-8">
        <h2 class="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
        </h2>
        <div class="h-1 w-16 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
    </div>

    <div class="flex justify-between gap-6">
        {#if (recipes && recipes.length > 0)}
            <Carousel.Root class="w-full" opts={{ align: "start", loop: true }}>
                <Carousel.Content class="items-start">
                    {#each recipes as recipe}
                        <Carousel.Item class="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                            <RecipeCard
                                id={recipe.id}
                                title={recipe.title}
                                description={recipe.description}
                                image={recipe.image}
                                servings={recipe.servings}
                                cookingTime={recipe.cookingTime}
                                difficulty={recipe.difficulty}
                                tags={recipe.tags ?? []}
                            />
                        </Carousel.Item>
                    {/each}
                </Carousel.Content>
                <Carousel.Previous class="shadow-md hover:shadow-lg transition-shadow duration-200"/>
                <Carousel.Next class="shadow-md hover:shadow-lg transition-shadow duration-200"/>
            </Carousel.Root>
        {:else}
            <div class="flex flex-col items-center justify-center py-12 text-center w-full">
                <div class="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                    <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-muted-foreground text-lg font-medium">{m["recipe.list.noRecipes"]()}</p>
            </div>
        {/if}
    </div>
</div>
