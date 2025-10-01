<script lang="ts">
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import * as Carousel from "$lib/components/ui/carousel";
    import type {HTMLAttributes} from "svelte/elements";
    import type {ComponentProps} from "svelte";
    import type {Recipe} from "$lib/server/db/schema";
    import { m } from "$lib/paraglide/messages";

    type Props = {
        title: string;
        class?: string;
        recipes: Recipe[];
    }

    const {class: className, title, recipes}: Props = $props();
</script>

<div class={`w-full ${className}`}>
    <h2 class="text-2xl font-bold mb-6">
        { title }
    </h2>
    <div class="flex justify-between gap-6">
        {#if (recipes.length > 0)}
            <Carousel.Root class="w-full flex justify-center">
                <Carousel.Content class="-ml-1">
                    {#each recipes as recipe}
                        <Carousel.Item class="pl-1 md:basis-1/2 lg:basis-1/3">
                            <div class="p-1">
                                <RecipeCard id={recipe.id} title={recipe.title} description={recipe.description}
                                            image={recipe.image}
                                            servings={recipe.servings}
                                            cookingTime={recipe.cookingTime} difficulty="easy"/>
                            </div>
                        </Carousel.Item>
                    {/each}
                </Carousel.Content>
                <Carousel.Previous />
                <Carousel.Next />
            </Carousel.Root>
        {:else}
            <p class="text-muted-foreground text-md">{m["recipe.list.noRecipes"]()}</p>
        {/if}
    </div>
</div>