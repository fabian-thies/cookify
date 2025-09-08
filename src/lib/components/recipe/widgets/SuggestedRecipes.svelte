<script lang="ts">
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import * as Carousel from "$lib/components/ui/carousel";

    type Props = {
        title: string;
        class?: string;
    }

    const {class: className, title}: Props = $props();
</script>

<div class={`w-full ${className}`}>
    <h2 class="text-2xl font-bold mb-6">
        { title }
    </h2>
    <div class="flex justify-between gap-6">
        <Carousel.Root class="w-full flex justify-center">
            <Carousel.Content class="-ml-1">
                {#each Array(5) as _, i (i)}
                    <Carousel.Item class="pl-1 md:basis-1/2 lg:basis-1/3">
                        <div class="p-1">
                            <RecipeCard title="Title" description="Description" image="https://picsum.photos/1500/1500"
                                        serves={4}
                                        cookingTime={20} rating={4.5} difficulty="EASY"/>
                        </div>
                    </Carousel.Item>
                {/each}
            </Carousel.Content>

            <Carousel.Previous />
            <Carousel.Next />
        </Carousel.Root>
    </div>
</div>