<script lang="ts">
    import RecipeCard from '$lib/components/RecipeCard.svelte';
    import {goto} from '$app/navigation';
    import {updatePage} from "$lib/utils/pagination";
    import Icon from "@iconify/svelte";

    let {data}: PageProps = $props();
    let search = $state('');
    let selectedCategory = $state('Alle');
    let selectedDifficulty = $state('Alle');
    let maxCookTime = $state<number | null>(null);

    const categories = [
        "Alle",
        "Italienisch",
        "Russisch",
        "Vegetarisch",
        "Indisch",
        "Französisch",
        "Japanisch",
        "Mexikanisch",
        "Griechisch",
        "Deutsch",
        "Asiatisch"
    ];

    const difficulties = ["Alle", "Einfach", "Mittel", "Schwer"];

    const filteredRecipes = $derived.by(() => {
        return data.recipes.filter(recipe => {
            const matchesSearch = !search ||
                recipe.title.toLowerCase().includes(search.toLowerCase()) ||
                recipe.description.toLowerCase().includes(search.toLowerCase());

            const matchesCategory = selectedCategory === "Alle" ||
                (recipe.categories && recipe.categories.includes(selectedCategory)) ||
                recipe.category === selectedCategory;

            const matchesDifficulty = selectedDifficulty === "Alle" ||
                (recipe.difficulty || "Einfach") === selectedDifficulty;

            const matchesCookTime = !maxCookTime ||
                (recipe.cookTime && recipe.cookTime <= maxCookTime);

            return matchesSearch && matchesCategory && matchesDifficulty && matchesCookTime;
        });
    });

    function resetFilters() {
        selectedCategory = "Alle";
        selectedDifficulty = "Alle";
        maxCookTime = null;
        search = "";
    }

    const activeFiltersCount = $derived(() => {
        let count = 0;
        if (selectedCategory !== "Alle") count++;
        if (selectedDifficulty !== "Alle") count++;
        if (maxCookTime !== null) count++;
        return count;
    });

    $effect(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        if (search) {
            url.searchParams.set('search', search);
        }

        goto(url.toString(), {
            replaceState: true,
            keepFocus: true,
            noScroll: true
        });
    });
</script>

<section class="max-w-screen-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-base-content mb-6">Alle Rezepte</h1>

        <div class="relative mb-6">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <Icon icon="lucide:search" class="w-5 h-5 text-base-content/40" />
            </div>
            <input
                    aria-label="Rezepte durchsuchen"
                    bind:value={search}
                    class="input input-bordered w-full pl-10 pr-4 py-2 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Rezepte durchsuchen..."
                    type="search"
            />
        </div>

        <div class="flex flex-wrap gap-4 items-center">
            <div class="dropdown">
                <div tabindex="0" role="button" class="btn btn-outline w-48 border border-base-content/30">
                    <Icon icon="lucide:tag" class="w-4 h-4 mr-2"/>
                    {selectedCategory}
                    <Icon icon="lucide:chevron-down" class="w-4 h-4 ml-auto"/>
                </div>
                <ul tabindex="0"
                    class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg">
                    {#each categories as category}
                        <li>
                            <button
                                    class="justify-start"
                                    class:active={selectedCategory === category}
                                    onclick={() => selectedCategory = category}
                            >
                                {category}
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>

            <div class="dropdown">
                <div tabindex="0" role="button" class="btn btn-outline w-48 border border-base-content/30">
                    <Icon icon="lucide:bar-chart-3" class="w-4 h-4 mr-2"/>
                    {selectedDifficulty}
                    <Icon icon="lucide:chevron-down" class="w-4 h-4 ml-auto"/>
                </div>
                <ul tabindex="0"
                    class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg">
                    {#each difficulties as difficulty}
                        <li>
                            <button
                                    class="justify-start"
                                    class:active={selectedDifficulty === difficulty}
                                    onclick={() => selectedDifficulty = difficulty}
                            >
                                {difficulty}
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>

            <div class="dropdown">
                <div tabindex="0" role="button" class="btn btn-outline w-48 border-base-content/30">
                    <Icon icon="lucide:clock" class="w-4 h-4 mr-2"/>
                    {maxCookTime ? `≤ ${maxCookTime} Min` : 'Zubereitungszeit'}
                    <Icon icon="lucide:chevron-down" class="w-4 h-4 ml-auto"/>
                </div>
                <ul tabindex="0"
                    class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg">
                    <li>
                        <button
                                class="justify-start"
                                class:active={maxCookTime === null}
                                onclick={() => maxCookTime = null}
                        >
                            Alle Zeiten
                        </button>
                    </li>
                    <li>
                        <button
                                class="justify-start"
                                class:active={maxCookTime === 15}
                                onclick={() => maxCookTime = 15}
                        >
                            ≤ 15 Minuten
                        </button>
                    </li>
                    <li>
                        <button
                                class="justify-start"
                                class:active={maxCookTime === 30}
                                onclick={() => maxCookTime = 30}
                        >
                            ≤ 30 Minuten
                        </button>
                    </li>
                    <li>
                        <button
                                class="justify-start"
                                class:active={maxCookTime === 60}
                                onclick={() => maxCookTime = 60}
                        >
                            ≤ 1 Stunde
                        </button>
                    </li>
                    <li>
                        <button
                                class="justify-start"
                                class:active={maxCookTime === 120}
                                onclick={() => maxCookTime = 120}
                        >
                            ≤ 2 Stunden
                        </button>
                    </li>
                </ul>
            </div>

            {#if search || selectedCategory !== "Alle" || selectedDifficulty !== "Alle" || maxCookTime !== null}
                <button
                        class="btn btn-ghost btn-sm"
                        onclick={resetFilters}
                >
                    <Icon icon="lucide:x" class="w-4 h-4 mr-1"/>
                    Filter zurücksetzen
                </button>
            {/if}
        </div>

        {#if activeFiltersCount > 0}
            <div class="flex flex-wrap gap-2 mt-4">
                {#if selectedCategory !== "Alle"}
                    <div class="badge badge-primary gap-1">
                        {selectedCategory}
                        <button onclick={() => selectedCategory = "Alle"}>
                            <Icon icon="lucide:x" class="w-3 h-3"/>
                        </button>
                    </div>
                {/if}
                {#if selectedDifficulty !== "Alle"}
                    <div class="badge badge-secondary gap-1">
                        {selectedDifficulty}
                        <button onclick={() => selectedDifficulty = "Alle"}>
                            <Icon icon="lucide:x" class="w-3 h-3"/>
                        </button>
                    </div>
                {/if}
                {#if maxCookTime}
                    <div class="badge badge-accent gap-1">
                        ≤ {maxCookTime} Min
                        <button onclick={() => maxCookTime = null}>
                            <Icon icon="lucide:x" class="w-3 h-3"/>
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    {#if filteredRecipes.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <Icon
                    icon="lucide:chef-hat"
                    class="w-16 h-16 text-base-content/30 mb-4"
            />
            <h3 class="text-lg font-semibold mb-2 text-base-content">Keine Rezepte gefunden</h3>
            <p class="text-base-content/70 mb-4">Versuchen Sie andere Suchbegriffe oder Filter.</p>
            <button class="btn btn-primary" onclick={resetFilters}>
                <Icon icon="lucide:refresh-cw" class="w-4 h-4 mr-2"/>
                Filter zurücksetzen
            </button>
        </div>
    {:else}
        <div class="mb-6">
            <p class="text-base-content/60">
                {filteredRecipes.length} {filteredRecipes.length === 1 ? "Rezept" : "Rezepte"} gefunden
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each filteredRecipes as recipe}
                <RecipeCard
                        id={recipe.id}
                        title={recipe.title}
                        description={recipe.description}
                        image={recipe.imageUrl}
                        categories={recipe.categories}
                        cookTime={recipe.cookTime}
                        difficulty={recipe.difficulty || "Einfach"}
                        rating={recipe.rating || 0}
                        servings={recipe.servings || 1}
                        href={`/recipes/${recipe.id}`}
                        saved={recipe.isSaved}
                />
            {/each}
        </div>

        <div class="flex justify-center mt-12">
            <div class="join">
                <button
                        class="join-item btn btn-neutral"
                        class:btn-disabled={data.pagination.page === 1}
                        onclick={() => updatePage(data.pagination.page - 1)}
                        disabled={data.pagination.page === 1}
                        aria-label="Previous page"
                >
                    <Icon icon="lucide:chevron-left" class="h-5 w-5"/>
                </button>
                <button class="join-item btn btn-neutral">
                    {data.pagination.page}
                </button>
                <button
                        class="join-item btn btn-neutral"
                        class:btn-disabled={!data.pagination.hasNextPage}
                        onclick={() => updatePage(data.pagination.page + 1)}
                        disabled={!data.pagination.hasNextPage}
                        aria-label="Next page"
                >
                    <Icon icon="lucide:chevron-right" class="h-5 w-5"/>
                </button>
            </div>
        </div>
    {/if}
</section>
