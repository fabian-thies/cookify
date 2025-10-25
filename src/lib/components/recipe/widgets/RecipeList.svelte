<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import type {Recipe} from "$lib/server/db/recipe";
    import {Button} from "$lib/components/ui/button";
    import {m} from "$lib/paraglide/messages";
    import {difficultySelectOptions} from "$lib/types/recipe";
    import type {Snippet} from "svelte";

    type Props = {
        recipes: Recipe[];
        title?: string;
        showFilters?: boolean;
        actions? : Snippet;
    };

    const cookTimeFilters = [
        {
            value: "",
            label: m["recipe.list.cookTime.options.any"](),
            matches: () => true
        },
        {
            value: "0-15",
            label: m["recipe.list.cookTime.options.upTo15"](),
            matches: (time: number) => time <= 15
        },
        {
            value: "15-30",
            label: m["recipe.list.cookTime.options.from15To30"](),
            matches: (time: number) => time >= 15 && time <= 30
        },
        {
            value: "30-60",
            label: m["recipe.list.cookTime.options.from30To60"](),
            matches: (time: number) => time >= 30 && time <= 60
        }
    ] as const;

    const cookTimeSelectOptions = cookTimeFilters.map(({value, label}) => ({value, label}));

    let {recipes, title, showFilters = true, actions}: Props = $props();

    let search = $state("");
    let selectedDifficulty = $state("");
    let selectedCookTime = $state("");
    let filterActive = $derived(!!search || !!selectedDifficulty || !!selectedCookTime);

    const filteredRecipes = $derived.by(() => {
        return recipes.filter(recipe => {
            const matchesSearch = recipe.title
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesDifficulty =
                !selectedDifficulty || String(recipe.difficulty) === selectedDifficulty;

            const cookTime = Number(recipe.cookingTime ?? 0);
            const selectedFilter = cookTimeFilters.find(({value}) => value === selectedCookTime);
            const matchesCookTime = selectedFilter ? selectedFilter.matches(cookTime) : true;

            return matchesSearch && matchesDifficulty && matchesCookTime;
        });
    });

    const clearFilters = () => {
        search = "";
        selectedDifficulty = "";
        selectedCookTime = "";
    };
</script>

<div class="flex flex-col gap-4 p-4 mt-6">
    {#if title || actions}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {#if title}
                <h1 class="font-bold text-3xl mb-0">{title}</h1>
            {/if}

            {#if actions}
                <div class="flex items-center gap-2">
                    {@render actions?.()}
                </div>
            {/if}
        </div>
    {/if}

    {#if showFilters}
        <Input type="search" placeholder={m["recipe.list.searchPlaceholder"]()} class="flex justify-center"
               bind:value={search}/>

        <div class="flex flex-wrap gap-2 pb-6">
            <SelectComponent
                    options={difficultySelectOptions}
                    placeholder={m["recipe.list.difficultyPlaceholder"]()}
                    groupLabel={m["recipe.list.groupLabel"]()}
                    name="category"
                    class=""
                    bind:value={selectedDifficulty}
            />
            <SelectComponent
                    options={cookTimeSelectOptions}
                    placeholder={m["recipe.list.cookTimePlaceholder"]()}
                    groupLabel={m["recipe.list.cookTimeGroupLabel"]()}
                    name="cookTime"
                    class=""
                    bind:value={selectedCookTime}
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
    {#if filteredRecipes.length === 0}
        <div class="flex flex-col items-center justify-center py-6 text-center">
            <p class="text-muted-foreground text-md">{m["recipe.list.noRecipes"]()}</p>
        </div>
    {:else}
        <p class="text-muted-foreground">{m["recipe.list.results"]({count: filteredRecipes.length})}</p>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe}/>
        {/each}
    </div>
</div>
