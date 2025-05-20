<script lang="ts">
    import RecipeCard from '$lib/components/RecipeCard.svelte';
    import {goto} from '$app/navigation';
    import {updatePage} from "$lib/utils/pagination";
    import Icon from "@iconify/svelte";

    let {data}: PageProps = $props();
    let search = $state('');

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

<section class="max-w-screen-xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <h2 class="text-2xl font-bold tracking-tight">Alle Rezepte</h2>
        <div class="relative w-full sm:w-80">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"></path>
                </svg>
            </div>
            <input
                    aria-label="Rezepte durchsuchen"
                    bind:value={search}
                    class="input input-bordered w-full pl-5 pr-4 py-2 rounded-field focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Suche nach Titel..."
                    type="search"
            />
        </div>
    </div>

    {#if data.recipes.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <Icon
                    icon={'nonicons:not-found-16'}
                    width="64"
                    height="64"
                    style="transition: 0.2s ease"
            />
            <p class="text-xl text-base-content/70 mt-4">Keine Rezepte gefunden.</p>
            <p class="text-lg text-base-content/50 mt-2">Versuche es mit einem anderen Suchbegriff.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {#each data.recipes as recipe}
                <RecipeCard
                        id={recipe.id}
                        title={recipe.title}
                        description={recipe.description}
                        image={recipe.imageUrl}
                        categories={recipe.categories}
                        cookTime={recipe.cookTime}
                        href={`/recipes/${recipe.id}`}
                        saved={recipe.isSaved}
                />
            {/each}
        </div>

        <!-- Pagination -->
        <div class="flex justify-center mt-12">
            <nav class="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                        class="relative inline-flex items-center px-4 py-2 rounded-l-md bg-neutral text-sm font-medium hover:bg-neutral/10 transition-colors duration-200 ease-in-out cursor-pointer"
                        onclick={() => updatePage(data.pagination.page - 1)}
                        disabled={data.pagination.page === 1}
                        aria-label="Previous page"
                >
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                         aria-hidden="true">
                        <path fill-rule="evenodd"
                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                              clip-rule="evenodd"/>
                    </svg>
                </button>
                <button class="relative inline-flex items-center px-4 py-2 bg-neutral text-sm font-medium hover:bg-neutral/10 cursor-pointer">
                    {data.pagination.page}
                </button>
                <button
                        class="relative inline-flex items-center px-4 py-2 rounded-r-md bg-neutral text-sm font-medium hover:bg-neutral/10 transition-colors duration-200 ease-in-out cursor-pointer"
                        onclick={() => updatePage(data.pagination.page + 1)}
                        disabled={!data.pagination.hasNextPage}
                        aria-label="Next page"
                >
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                         aria-hidden="true">
                        <path fill-rule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clip-rule="evenodd"/>
                    </svg>
                </button>
            </nav>
        </div>
    {/if}
</section>
