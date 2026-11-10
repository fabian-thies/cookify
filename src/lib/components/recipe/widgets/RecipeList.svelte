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
    import {Spinner} from "$lib/components/ui/spinner";

    type Props = {
        recipes: Recipe[];
        userId: string;
        title?: string;
        showFilters?: boolean;
        loading?: boolean;
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

    let {userId, recipes, title, showFilters = true, loading = false, actions}: Props = $props();

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

<div class="flex flex-col gap-6 mt-2">
    {#if title || actions}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {#if title}
                <div class="space-y-1">
                    <h1 class="font-bold text-3xl sm:text-4xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    <div class="h-1 w-20 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
                </div>
            {/if}

            {#if actions}
                <div class="flex items-center gap-2">
                    {@render actions?.()}
                </div>
            {/if}
        </div>
    {/if}

    {#if showFilters}
        <div class="flex gap-3 items-center">
            <div class="relative flex-1">
                <Input
                    type="search"
                    placeholder={m["recipe.list.searchPlaceholder"]()}
                    class="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                    bind:value={search}
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <Popover.Root bind:open={filterPopoverOpen}>
                <Popover.Trigger class={buttonVariants({ variant: "outline" }) + " relative h-11 px-4 shadow-sm hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/50 bg-background/50 backdrop-blur-sm"}>
                    <SlidersHorizontal class="h-4 w-4 mr-2"/>
                    <span class="hidden sm:inline font-medium">Filter</span>
                    {#if activeFilterCount > 0}
                        <Badge variant="default" class="ml-2 px-2 py-0.5 text-xs bg-primary/90 hover:bg-primary shadow-sm">
                            {activeFilterCount}
                        </Badge>
                    {/if}
                </Popover.Trigger>
                <Popover.Content class="w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto backdrop-blur-xl bg-popover/95 border-border/50 shadow-xl sm:w-80" align="end">
                    <div class="flex flex-col gap-5">
                        <div class="space-y-2">
                            <h4 class="font-semibold text-base flex items-center gap-2">
                                <Filter class="h-5 w-5 text-primary"/>
                                {m["recipe.list.filterTitle"]()}
                            </h4>
                            <p class="text-sm text-muted-foreground leading-relaxed">
                                {m["recipe.list.filterDescription"]()}
                            </p>
                        </div>

                        <Separator class="bg-border/50"/>

                        <div class="space-y-3">
                            <label class="text-sm font-semibold text-foreground">
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

                        <div class="space-y-3">
                            <label class="text-sm font-semibold text-foreground">
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

                        <div class="space-y-3">
                            <label class="text-sm font-semibold text-foreground">
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

                        <div class="space-y-3">
                            <label class="text-sm font-semibold text-foreground">
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
                            <Separator class="bg-border/50"/>
                            <Button
                                onclick={clearFilters}
                                variant="outline"
                                size="sm"
                                class="w-full shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <X class="h-4 w-4 mr-2"/>
                                {m["recipe.list.clearFilters"]()}
                            </Button>
                        {/if}
                    </div>
                </Popover.Content>
            </Popover.Root>
        </div>

        {#if filterActive}
            <div class="flex flex-wrap gap-2 items-center bg-muted/30 p-4 rounded-lg border border-border/50 backdrop-blur-sm">
                <span class="text-sm font-medium text-muted-foreground">{m["recipe.list.activeFilters"]()}</span>
                {#if selectedDifficulty}
                    <Badge variant="secondary" class="gap-1.5 pl-3 pr-2 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                        {difficultySelectOptions.find(d => d.value === selectedDifficulty)?.label}
                        <button
                            onclick={() => selectedDifficulty = ""}
                            class="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors duration-150"
                            aria-label="Remove filter"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedCookTime}
                    <Badge variant="secondary" class="gap-1.5 pl-3 pr-2 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                        {cookTimeSelectOptions.find(c => c.value === selectedCookTime)?.label}
                        <button
                            onclick={() => selectedCookTime = ""}
                            class="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors duration-150"
                            aria-label="Remove filter"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedTag}
                    <Badge variant="secondary" class="gap-1.5 pl-3 pr-2 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                        {selectedTag}
                        <button
                            onclick={() => selectedTag = ""}
                            class="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors duration-150"
                            aria-label="Remove filter"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if author && author !== "all"}
                    <Badge variant="secondary" class="gap-1.5 pl-3 pr-2 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                        {authorSelectOptions.find(a => a.value === author)?.label}
                        <button
                            onclick={() => author = ""}
                            class="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors duration-150"
                            aria-label="Remove filter"
                        >
                            <X class="h-3 w-3"/>
                        </button>
                    </Badge>
                {/if}
                <Button
                    onclick={clearFilters}
                    variant="ghost"
                    size="sm"
                    class="h-8 text-xs ml-auto hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                >
                    {m["recipe.list.clearAll"]()}
                </Button>
            </div>
        {/if}
    {/if}

    {#if loading}
        <div class="flex items-center justify-center py-16">
            <Spinner class="size-8"/>
        </div>
    {:else if filteredRecipes.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p class="text-muted-foreground text-lg font-medium">{m["recipe.list.noRecipes"]()}</p>
        </div>
    {:else}
        <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-muted-foreground">
                {m["recipe.list.results"]({count: filteredRecipes.length})}
            </p>
        </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 place-items-stretch">
        {#each filteredRecipes as recipe (recipe.id)}
            <RecipeCard {...recipe}/>
        {/each}
    </div>
</div>
