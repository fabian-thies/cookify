<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import type {Recipe} from "$lib/server/db/recipe";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {m} from "$lib/paraglide/messages";
    import {difficultySelectOptions} from "$lib/types/recipe";
    import type {Snippet} from "svelte";
    import * as Popover from "$lib/components/ui/popover";
    import {Badge} from "$lib/components/ui/badge";
    import {Filter, X, SlidersHorizontal} from "lucide-svelte";
    import {Separator} from "$lib/components/ui/separator";

    type Props = {
        recipes: Recipe[];
        userId: string;
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
    const authorSelectOptions = [
        {value: "all", label: m["recipe.list.author.options.all"]()},
        {value: "user", label: m["recipe.list.author.options.user"]()}
    ];

    let {userId, recipes, title, showFilters = true, actions}: Props = $props();

    let search = $state("");
    let selectedDifficulty = $state("");
    let selectedCookTime = $state("");
    let selectedTag = $state("");
    let author = $state("");
    let filterPopoverOpen = $state(false);

    const activeFilterCount = $derived.by(() => {
        let count = 0;
        if (selectedDifficulty) count++;
        if (selectedCookTime) count++;
        if (selectedTag) count++;
        if (author && author !== "all") count++;
        return count;
    });

    const availableTags = $derived.by(() => {
        const tags = new Set<string>();
        for (const recipe of recipes) {
            (recipe.tags ?? []).forEach(tag => tag && tags.add(tag));
        }

        return Array.from(tags)
            .sort((a, b) => a.localeCompare(b))
            .map(tag => ({value: tag, label: tag}));
    });

    let filterActive = $derived(!!search || !!selectedDifficulty || !!selectedCookTime || !!selectedTag || !!author);

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

            const recipeTags = recipe.tags ?? [];
            const matchesTags = !selectedTag || recipeTags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());

            const matchesAuthor =
                !author ||
                author === "all" ||
                (author === "user" && recipe.userId === userId);

            return matchesSearch && matchesDifficulty && matchesCookTime && matchesTags && matchesAuthor;
        });
    });

    const clearFilters = () => {
        search = "";
        selectedDifficulty = "";
        selectedCookTime = "";
        selectedTag = "";
        author = "";
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
        <!-- Search Bar and Filter Button -->
        <div class="flex gap-2 items-center">
            <Input
                type="search"
                placeholder={m["recipe.list.searchPlaceholder"]()}
                class="flex-1"
                bind:value={search}
            />
            <Popover.Root bind:open={filterPopoverOpen}>
                <Popover.Trigger class={buttonVariants({ variant: "outline" }) + " relative"}>
                    <SlidersHorizontal class="h-4 w-4 mr-2"/>
                    <span class="hidden sm:inline">Filter</span>
                    {#if activeFilterCount > 0}
                        <Badge variant="secondary" class="ml-2 px-1.5 py-0.5 text-xs">
                            {activeFilterCount}
                        </Badge>
                    {/if}
                </Popover.Trigger>
                <Popover.Content class="w-80 max-h-[calc(100vh-200px)] overflow-y-auto" align="end">
                    <div class="flex flex-col gap-4">
                        <div class="space-y-2">
                            <h4 class="font-semibold text-sm flex items-center gap-2">
                                <Filter class="h-4 w-4"/>
                                {m["recipe.list.filterTitle"]()}
                            </h4>
                            <p class="text-xs text-muted-foreground">
                                {m["recipe.list.filterDescription"]()}
                            </p>
                        </div>

                        <Separator/>

                        <!-- Difficulty Filter -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">
                                {m["recipe.list.groupLabel"]()}
                            </label>
                            <SelectComponent
                                options={difficultySelectOptions}
                                placeholder={m["recipe.list.difficultyPlaceholder"]()}
                                groupLabel={m["recipe.list.groupLabel"]()}
                                name="category"
                                class="w-full"
                                bind:value={selectedDifficulty}
                            />
                        </div>

                        <!-- Cook Time Filter -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">
                                {m["recipe.list.cookTimeGroupLabel"]()}
                            </label>
                            <SelectComponent
                                options={cookTimeSelectOptions}
                                placeholder={m["recipe.list.cookTimePlaceholder"]()}
                                groupLabel={m["recipe.list.cookTimeGroupLabel"]()}
                                name="cookTime"
                                class="w-full"
                                bind:value={selectedCookTime}
                            />
                        </div>

                        <!-- Tags Filter -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">
                                {m["recipe.list.tagsGroupLabel"]()}
                            </label>
                            <SelectComponent
                                options={availableTags}
                                placeholder={m["recipe.list.tagsPlaceholder"]()}
                                groupLabel={m["recipe.list.tagsGroupLabel"]()}
                                name="tags"
                                class="w-full"
                                bind:value={selectedTag}
                                disabled={availableTags.length === 0}
                            />
                        </div>

                        <!-- Author Filter -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">
                                {m["recipe.list.authorGroupLabel"]()}
                            </label>
                            <SelectComponent
                                options={authorSelectOptions}
                                placeholder={m["recipe.list.authorPlaceholder"]()}
                                groupLabel={m["recipe.list.authorGroupLabel"]()}
                                name="author"
                                class="w-full"
                                bind:value={author}
                            />
                        </div>

                        {#if filterActive}
                            <Separator/>
                            <Button
                                onclick={clearFilters}
                                variant="outline"
                                size="sm"
                                class="w-full"
                            >
                                <X class="h-4 w-4 mr-2"/>
                                {m["recipe.list.clearFilters"]()}
                            </Button>
                        {/if}
                    </div>
                </Popover.Content>
            </Popover.Root>
        </div>

        <!-- Active Filters Display -->
        {#if filterActive}
            <div class="flex flex-wrap gap-2 items-center">
                <span class="text-sm text-muted-foreground">{m["recipe.list.activeFilters"]()}</span>
                {#if selectedDifficulty}
                    <Badge variant="secondary" class="gap-1">
                        {difficultySelectOptions.find(d => d.value === selectedDifficulty)?.label}
                        <button
                            onclick={() => selectedDifficulty = ""}
                            class="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedCookTime}
                    <Badge variant="secondary" class="gap-1">
                        {cookTimeSelectOptions.find(c => c.value === selectedCookTime)?.label}
                        <button
                            onclick={() => selectedCookTime = ""}
                            class="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedTag}
                    <Badge variant="secondary" class="gap-1">
                        {selectedTag}
                        <button
                            onclick={() => selectedTag = ""}
                            class="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if author && author !== "all"}
                    <Badge variant="secondary" class="gap-1">
                        {authorSelectOptions.find(a => a.value === author)?.label}
                        <button
                            onclick={() => author = ""}
                            class="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                <Button
                    onclick={clearFilters}
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs"
                >
                    {m["recipe.list.clearAll"]()}
                </Button>
            </div>
        {/if}
    {/if}
    {#if filteredRecipes.length === 0}
        <div class="flex flex-col items-center justify-center py-6 text-center">
            <p class="text-muted-foreground text-md">{m["recipe.list.noRecipes"]()}</p>
        </div>
    {:else}
        <p class="text-muted-foreground">{m["recipe.list.results"]({count: filteredRecipes.length})}</p>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 place-items-center">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe}/>
        {/each}
    </div>
</div>
