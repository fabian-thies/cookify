<script lang="ts">
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {Input} from "$lib/components/ui/input";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import type {PageProps} from "./$types";

    const { data }: PageProps = $props();

    const recipes = data.recipes;
    const difficulties = data.difficulties;

    let search = $state("");
    let selectedDifficulty = $state("");

    const filteredRecipes = $derived.by(() => {
        return recipes.filter(recipe => {
            const matchesSearch = recipe.title
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesDifficulty =
                !selectedDifficulty || String(recipe.difficulty) === selectedDifficulty;

            return matchesSearch && matchesDifficulty;
        });
    });

    const difficultiesOptions = difficulties.map(difficulty => ({
        value: difficulty.difficulty,
        label: difficulty.difficulty
    }));
</script>

<div class="flex flex-col gap-4 p-4 mt-6">
    <h1 class="font-bold text-3xl mb-2">Rezepte</h1>
    <Input type="search" placeholder="Search" class="flex justify-center" bind:value={search}/>

    <div class="flex flex-wrap gap-2">
        <SelectComponent
                options={difficultiesOptions}
                placeholder="Select a difficulty"
                groupLabel="Kategorien"
                name="category"
                class=""
                bind:value={selectedDifficulty}
        />
    </div>
    <div class="pt-6 pb-2">
        <p class="text-muted-foreground">{filteredRecipes.length} Rezepte gefunden</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe} />
        {/each}
    </div>
</div>
