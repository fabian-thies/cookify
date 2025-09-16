<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import type {Difficulty, Recipe} from "$lib/server/db/recipe";
    import {Button} from "$lib/components/ui/button";
    import { m } from "$lib/paraglide/messages";

    type Props = {
        recipes: Recipe[];
        difficulties: Difficulty[];
        title: string;
    };

    let {recipes, difficulties, title}: Props = $props();

    let search = $state("");
    let selectedDifficulty = $state("");
    let filterActive = $derived(!!search || !!selectedDifficulty);

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

    const clearFilters = () => {
        search = "";
        selectedDifficulty = "";
    };

    const difficultiesOptions = difficulties.map(difficulty => ({
        value: difficulty.difficulty,
        label: difficulty.difficulty
    }));
</script>

<div class="flex flex-col gap-4 p-4 mt-6">
    <h1 class="font-bold text-3xl mb-2">{title}</h1>
    <Input type="search" placeholder={m["recipe.list.searchPlaceholder"]()} class="flex justify-center" bind:value={search}/>

    <div class="flex flex-wrap gap-2">
        <SelectComponent
                options={difficultiesOptions}
                placeholder={m["recipe.list.difficultyPlaceholder"]()}
                groupLabel={m["recipe.list.groupLabel"]()}
                name="category"
                class=""
                bind:value={selectedDifficulty}
        />
        {#if filterActive}
            <Button
                    class="btn btn-outline btn-secondary"
                    onclick={clearFilters}
                    variant="outline"
            >
                Clear Filters
            </Button>
        {/if}
    </div>
    <div class="pt-6 pb-2">
        <p class="text-muted-foreground">{filteredRecipes.length} {m["recipe.list.results"]({ count: filteredRecipes.length })}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe}/>
        {/each}
    </div>
</div>
