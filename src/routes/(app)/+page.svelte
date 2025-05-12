<script lang="ts">
    import RecipeCard from '$lib/components/RecipeCard.svelte';
    import {debounce} from '$lib/utils/debounce';
    import {goto} from '$app/navigation';

    let {data}: PageProps = $props();

    const onSearch = debounce((event: Event) => {
        const input = event.target as HTMLInputElement;
        const search = input.value;

        const url = new URL(window.location.href);
        url.searchParams.set('search', search);
        goto(url.toString(), {
            replaceState: true,
            keepFocus: true,
            noScroll: true
        });
    }, 300);

</script>

<section class="max-w-screen-xl mx-auto p-6">
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 class="text-xl font-semibold">Alle Rezepte</h2>
        <input
                class="input input-bordered w-full sm:w-80"
                placeholder="Suche nach Titel..."
                type="search"
                on:input={onSearch}
                aria-label="Rezepte durchsuchen"
        />
    </div>

    {#if data.recipes.length === 0}
        <p class="text-base-content/70">Keine Rezepte gefunden.</p>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each data.recipes as recipe}
                <RecipeCard
                        title={recipe.title}
                        description={recipe.description}
                        image={recipe.imageUrl}
                        categories={recipe.categories}
                        href={`/recipes/${recipe.id}`}
                />
            {/each}
        </div>
    {/if}
</section>
