<script lang="ts">
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {Input} from "$lib/components/ui/input";
    import RecipeCard from "$lib/components/recipe/RecipeCard.svelte";
    import type {PageProps} from "./$types";

    const { data }: PageProps = $props();

    const categories = [
        { value: "Hauptgericht", label: "Hauptgericht" },
        { value: "Dessert", label: "Dessert" },
        { value: "Vorspeise", label: "Vorspeise" }
    ];
</script>

<div class="flex flex-col gap-4 p-4 mt-6">
    <Input type="search" placeholder="Search" class="flex justify-center"/>

    <div class="flex flex-row gap-2">
        <SelectComponent
                options={categories}
                placeholder="Select a category"
                groupLabel="Kategorien"
                name="category"
                class="w-[200px]"
        />

        <SelectComponent
                options={categories}
                placeholder="Select a category"
                groupLabel="Kategorien"
                name="category"
                class="w-[200px]"
        />

        <SelectComponent
                options={categories}
                placeholder="Select a category"
                groupLabel="Kategorien"
                name="category"
                class="w-[200px]"
        />
    </div>

    <div class="pt-6 pb-2">
        <p class="text-muted-foreground">6 Rezepte gefunden</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
        {#each data.recipes as recipe (recipe.id)}
            <RecipeCard {...recipe} />
        {/each}
    </div>
</div>
