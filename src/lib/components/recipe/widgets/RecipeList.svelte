<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import RecipeCard from "$lib/components/recipe/widgets/RecipeCard.svelte";
    import RecipeCardSkeleton from "$lib/components/recipe/widgets/RecipeCardSkeleton.svelte";
    import type {Recipe} from "$lib/server/db/recipe";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {m} from "$lib/paraglide/messages";
    import {difficultySelectOptions} from "$lib/types/recipe";
    import type {Snippet} from "svelte";
    import * as Popover from "$lib/components/ui/popover";
    import {Badge} from "$lib/components/ui/badge";
    import {Filter, Plus, Search, SearchX, SlidersHorizontal, X} from "lucide-svelte";

    type Props = {
        recipes: Recipe[];
        userId: string;
        title?: string;
        showFilters?: boolean;
        loading?: boolean;
        emptyHref?: string;
        emptyLabel?: string;
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
            matches: (time: number) => time > 15 && time <= 30
        },
        {
            value: "30-60",
            label: m["recipe.list.cookTime.options.from30To60"](),
            matches: (time: number) => time > 30 && time <= 60
        }
    ] as const;

    const cookTimeSelectOptions = cookTimeFilters.map(({value, label}) => ({value, label}));
    const authorSelectOptions = [
        {value: "all", label: m["recipe.list.author.options.all"]()},
        {value: "user", label: m["recipe.list.author.options.user"]()}
    ];

    let {userId, recipes, title, showFilters = true, loading = false, emptyHref = "/recipe/create", emptyLabel = m["nav.create"](), actions}: Props = $props();

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

    let filterActive = $derived(!!search || !!selectedDifficulty || !!selectedCookTime || !!selectedTag || (!!author && author !== "all"));

    const filteredRecipes = $derived.by(() => {
        return recipes.filter(recipe => {
            const term = search.trim().toLowerCase();
            const recipeTags = recipe.tags ?? [];
            const matchesSearch =
                !term ||
                recipe.title.toLowerCase().includes(term) ||
                (recipe.description ?? "").toLowerCase().includes(term) ||
                recipeTags.some(tag => tag.toLowerCase().includes(term));

            const matchesDifficulty =
                !selectedDifficulty || String(recipe.difficulty) === selectedDifficulty;

            const cookTime = Number(recipe.cookingTime ?? 0);
            const selectedFilter = cookTimeFilters.find(({value}) => value === selectedCookTime);
            const matchesCookTime = selectedFilter ? selectedFilter.matches(cookTime) : true;

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

{#snippet cardSkeleton()}
    <RecipeCardSkeleton/>
{/snippet}

<div class="mt-2 flex flex-col gap-5">
    {#if title || actions}
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="space-y-1">
                {#if title}
                    <h1 class="page-title">{title}</h1>
                {/if}
                {#if !loading}
                    <p role="status" aria-live="polite" aria-atomic="true" class="text-sm text-muted-foreground">
                        {m["recipe.list.results"]({count: filteredRecipes.length})}
                    </p>
                {/if}
            </div>

            {#if actions}
                <div class="flex items-center gap-2">
                    {@render actions?.()}
                </div>
            {/if}
        </div>
    {/if}

    {#if showFilters}
        <div class="flex items-center gap-2">
            <div class="relative flex-1">
                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    aria-label={m["recipe.list.searchPlaceholder"]()}
                    bind:value={search}
                    class="h-11 pl-9 pr-10"
                    placeholder={m["recipe.list.searchPlaceholder"]()}
                    type="search"
                />
                {#if search}
                    <button
                        aria-label={m["search.clear"]()}
                        class="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        onclick={() => search = ""}
                        type="button"
                    >
                        <X class="size-4"/>
                    </button>
                {/if}
            </div>

            <Popover.Root bind:open={filterPopoverOpen}>
                <Popover.Trigger aria-label={m["recipe.list.filter"]()} class={buttonVariants({ variant: "outline" }) + " h-11 gap-2 px-3"}>
                    <SlidersHorizontal class="size-4"/>
                    <span class="hidden sm:inline">{m["recipe.list.filter"]()}</span>
                    {#if activeFilterCount > 0}
                        <span class="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {activeFilterCount}
                        </span>
                    {/if}
                </Popover.Trigger>
                <Popover.Content class="max-h-[70dvh] w-[calc(100vw-2rem)] overflow-y-auto border-border/70 bg-popover shadow-xl sm:w-80" align="end">
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between">
                            <h4 class="flex items-center gap-2 text-sm font-semibold">
                                <Filter class="size-4 text-primary"/>
                                {m["recipe.list.filterTitle"]()}
                            </h4>
                            {#if filterActive}
                                <button class="min-h-11 px-2 text-sm text-muted-foreground transition hover:text-foreground" onclick={clearFilters} type="button">
                                    {m["recipe.list.clearAll"]()}
                                </button>
                            {/if}
                        </div>

                        <div class="space-y-1.5">
                            <p class="text-xs font-medium text-muted-foreground">{m["recipe.list.groupLabel"]()}</p>
                            <SelectComponent
                                options={difficultySelectOptions}
                                placeholder={m["recipe.list.difficultyPlaceholder"]()}
                                groupLabel={m["recipe.list.groupLabel"]()}
                                name="category"
                                class="w-full"
                                bind:value={selectedDifficulty}
                            />
                        </div>

                        <div class="space-y-1.5">
                            <p class="text-xs font-medium text-muted-foreground">{m["recipe.list.cookTimeGroupLabel"]()}</p>
                            <SelectComponent
                                options={cookTimeSelectOptions}
                                placeholder={m["recipe.list.cookTimePlaceholder"]()}
                                groupLabel={m["recipe.list.cookTimeGroupLabel"]()}
                                name="cookTime"
                                class="w-full"
                                bind:value={selectedCookTime}
                            />
                        </div>

                        <div class="space-y-1.5">
                            <p class="text-xs font-medium text-muted-foreground">{m["recipe.list.tagsGroupLabel"]()}</p>
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

                        <div class="space-y-1.5">
                            <p class="text-xs font-medium text-muted-foreground">{m["recipe.list.authorGroupLabel"]()}</p>
                            <SelectComponent
                                options={authorSelectOptions}
                                placeholder={m["recipe.list.authorPlaceholder"]()}
                                groupLabel={m["recipe.list.authorGroupLabel"]()}
                                name="author"
                                class="w-full"
                                bind:value={author}
                            />
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Root>
        </div>

        {#if filterActive}
            <div class="-mt-2 flex flex-wrap items-center gap-1.5">
                {#if selectedDifficulty}
                    <Badge class="gap-1 py-1 pl-2.5 pr-1.5" variant="secondary">
                        {difficultySelectOptions.find(d => d.value === selectedDifficulty)?.label}
                        <button aria-label={m["recipe.list.clearFilters"]()} class="-mr-0.5 inline-flex size-8 items-center justify-center rounded-full transition hover:bg-background/60" onclick={() => selectedDifficulty = ""} type="button">
                            <X class="size-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedCookTime}
                    <Badge class="gap-1 py-1 pl-2.5 pr-1.5" variant="secondary">
                        {cookTimeSelectOptions.find(c => c.value === selectedCookTime)?.label}
                        <button aria-label={m["recipe.list.clearFilters"]()} class="-mr-0.5 inline-flex size-8 items-center justify-center rounded-full transition hover:bg-background/60" onclick={() => selectedCookTime = ""} type="button">
                            <X class="size-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if selectedTag}
                    <Badge class="gap-1 py-1 pl-2.5 pr-1.5" variant="secondary">
                        {selectedTag}
                        <button aria-label={m["recipe.list.clearFilters"]()} class="-mr-0.5 inline-flex size-8 items-center justify-center rounded-full transition hover:bg-background/60" onclick={() => selectedTag = ""} type="button">
                            <X class="size-3"/>
                        </button>
                    </Badge>
                {/if}
                {#if author && author !== "all"}
                    <Badge class="gap-1 py-1 pl-2.5 pr-1.5" variant="secondary">
                        {authorSelectOptions.find(a => a.value === author)?.label}
                        <button aria-label={m["recipe.list.clearFilters"]()} class="-mr-0.5 inline-flex size-8 items-center justify-center rounded-full transition hover:bg-background/60" onclick={() => author = ""} type="button">
                            <X class="size-3"/>
                        </button>
                    </Badge>
                {/if}
                <Button class="px-2 text-sm text-muted-foreground" onclick={clearFilters} size="sm" variant="ghost">
                    {m["recipe.list.clearAll"]()}
                </Button>
            </div>
        {/if}
    {/if}

    {#if loading}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {#each Array(8) as _}
                {@render cardSkeleton()}
            {/each}
        </div>
    {:else if filteredRecipes.length === 0}
        <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
            <div class="flex size-12 items-center justify-center rounded-full bg-muted">
                <SearchX class="size-5 text-muted-foreground"/>
            </div>
            <p class="font-medium">{m["recipe.list.noRecipes"]()}</p>
            {#if filterActive}
                <Button onclick={clearFilters} size="sm" variant="outline">
                    <X class="size-4"/>
                    {m["recipe.list.clearFilters"]()}
                </Button>
            {:else if recipes.length === 0}
                <Button href={emptyHref} size="sm">
                    {#if emptyHref === "/recipe/create"}<Plus class="size-4"/>{:else}<Search class="size-4"/>{/if}
                    {emptyLabel}
                </Button>
            {/if}
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {#each filteredRecipes as recipe (recipe.id)}
                <RecipeCard {...recipe}/>
            {/each}
        </div>
    {/if}
</div>
