<script lang="ts">
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import RecipeCardSkeleton from "$lib/components/recipe/widgets/RecipeCardSkeleton.svelte";
    import * as Carousel from "$lib/components/ui/carousel";
    import type {Recipe} from "$lib/server/db/recipe";
    import {m} from "$lib/paraglide/messages";
    import {UtensilsCrossed} from "lucide-svelte";

    type Props = {
        title: string;
        class?: string;
        recipes: Recipe[];
        loading?: boolean;
    }

    const {class: className, title, recipes, loading = false}: Props = $props();
</script>

<div class={`w-full ${className}`}>
    <div class="mb-4 sm:mb-5">
        <h2 class="section-title">{title}</h2>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {#each Array(4) as _}
                <RecipeCardSkeleton/>
            {/each}
        </div>
    {:else if (recipes && recipes.length > 0)}
        <Carousel.Root class="w-full" opts={{ align: "start", loop: recipes.length > 4 }}>
            <Carousel.Content class="items-start">
                {#each recipes as recipe}
                    <Carousel.Item class="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
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
            <Carousel.Previous class="hidden size-9 border border-border/70 bg-background/80 backdrop-blur transition hover:bg-background md:inline-flex"/>
            <Carousel.Next class="hidden size-9 border border-border/70 bg-background/80 backdrop-blur transition hover:bg-background md:inline-flex"/>
        </Carousel.Root>
    {:else}
        <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 py-12 text-center">
            <UtensilsCrossed class="size-6 text-muted-foreground"/>
            <p class="text-sm text-muted-foreground">{m["recipe.list.noRecipes"]()}</p>
        </div>
    {/if}
</div>
