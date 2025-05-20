<script lang="ts">
    import RecipeCard from '$lib/components/RecipeCard.svelte';
    import {goto} from '$app/navigation';
    import {updatePage} from "$lib/utils/pagination";

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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>
            <input
                    aria-label="Rezepte durchsuchen"
                    bind:value={search}
                    class="input input-bordered w-full pl-5 pr-4 py-2 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Suche nach Titel..."
                    type="search"
            />
        </div>
    </div>

    {#if data.recipes.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <svg class="w-16 h-16 text-gray-300 mb-4" viewBox="0 0 16 16" fill="currentColor" stroke="none"
                 xmlns="http://www.w3.org/2000/svg">
                <path d="M7.493 0.015 C 7.442 0.021,7.268 0.039,7.107 0.055 C 5.234 0.242,3.347 1.208,2.071 2.634 C 0.660 4.211,-0.057 6.168,0.009 8.253 C 0.124 11.854,2.599 14.903,6.110 15.771 C 8.169 16.280,10.433 15.917,12.227 14.791 C 14.017 13.666,15.270 11.933,15.771 9.887 C 15.943 9.186,15.983 8.829,15.983 8.000 C 15.983 7.171,15.943 6.814,15.771 6.113 C 14.979 2.878,12.315 0.498,9.000 0.064 C 8.716 0.027,7.683 -0.006,7.493 0.015 M8.853 1.563 C 9.548 1.653,10.198 1.848,10.840 2.160 C 11.538 2.500,12.020 2.846,12.587 3.413 C 13.154 3.980,13.500 4.462,13.840 5.160 C 14.285 6.075,14.486 6.958,14.486 8.000 C 14.486 9.054,14.284 9.932,13.826 10.867 C 13.654 11.218,13.307 11.781,13.145 11.972 L 13.090 12.037 8.527 7.473 L 3.963 2.910 4.028 2.855 C 4.219 2.693,4.782 2.346,5.133 2.174 C 6.305 1.600,7.555 1.395,8.853 1.563 M7.480 8.534 L 12.040 13.095 11.973 13.148 C 11.734 13.338,11.207 13.662,10.867 13.828 C 10.239 14.135,9.591 14.336,8.880 14.444 C 8.456 14.509,7.544 14.509,7.120 14.444 C 5.172 14.148,3.528 13.085,2.493 11.451 C 2.279 11.114,1.999 10.526,1.859 10.119 C 1.468 8.989,1.403 7.738,1.670 6.535 C 1.849 5.734,2.268 4.820,2.766 4.147 C 2.836 4.052,2.899 3.974,2.907 3.974 C 2.914 3.974,4.972 6.026,7.480 8.534 "
                      stroke="none" fill="currentColor"></path>
            </svg>
            <p class="text-lg text-base-content/70">Keine Rezepte gefunden.</p>
            <p class="text-sm text-base-content/50 mt-2">Versuche es mit einem anderen Suchbegriff.</p>
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
