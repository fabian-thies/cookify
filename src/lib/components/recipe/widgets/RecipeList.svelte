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
        title?: string;
        showFilters?: boolean;
    };

    let {recipes, difficulties, title, showFilters = true}: Props = $props();

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

    const difficultyLabel = {
        easy: () => m["recipe.common.difficulty.easy"](),
        medium: () => m["recipe.common.difficulty.medium"](),
        hard: () => m["recipe.common.difficulty.hard"]()
    } as const;

    const difficultiesOptions = difficulties.map(difficulty => {
        const key = difficulty.difficulty.toLowerCase() as keyof typeof difficultyLabel;
        return {
            value: difficulty.difficulty,
            label: difficultyLabel[key]?.() ?? difficulty.difficulty
        };
    });

    const clearFilters = () => {
        search = "";
        selectedDifficulty = "";
    };
</script>

<div class="flex flex-col gap-4 p-4 mt-6">
    {#if title}
        <h1 class="font-bold text-3xl mb-2">{title}</h1>
    {/if}

    {#if showFilters}
        <Input type="search" placeholder={m["recipe.list.searchPlaceholder"]()} class="flex justify-center" bind:value={search}/>

        <div class="flex flex-wrap gap-2 pb-6">
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
                    { m["recipe.list.clearFilters"]() }
                </Button>
            {/if}
        </div>
    {/if}
    <div class="pb-2">
        {#if filteredRecipes.length === 0}
            <div class="flex flex-col items-center justify-center py-6 text-center">
                <p class="text-muted-foreground text-md">{m["recipe.list.noRecipes"]()}</p>
            </div>
        {:else}
            <p class="text-muted-foreground">{m["recipe.list.results"]({ count: filteredRecipes.length })}</p>
        {/if}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe}/>
        {/each}
    </div>
</div>
