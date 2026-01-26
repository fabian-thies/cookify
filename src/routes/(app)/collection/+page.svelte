<script lang="ts">
import CollectionCard from "$lib/components/collection/CollectionCard.svelte";
import CollectionCardSkeleton from "$lib/components/collection/CollectionCardSkeleton.svelte";
import {getCollections} from "$lib/functions/recipe.remote";
import {m} from "$lib/paraglide/messages";
import type {Collection} from "$lib/server/db/schema";

let collections = $state<Collection[]>([]);
let loading = $state(true);

$effect(() => {
    loading = true;
    getCollections().then((result) => {
        collections = result;
        loading = false;
    });
});
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6 mt-4">
    <div class="space-y-1">
        <h1 class="font-bold text-4xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {m["nav.collection"]()}
        </h1>
        <div class="h-1 w-20 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-stretch">
            {#each Array(8) as _}
                <CollectionCardSkeleton />
            {/each}
        </div>
    {:else if collections.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
            </div>
            <p class="text-muted-foreground text-lg font-medium">{m["collection.noCollections"]()}</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-stretch">
            {#each collections as {title, recipeCount, id, thumbnails}}
                <CollectionCard title={title} images={thumbnails} collectionId={id} recipeCount={recipeCount}/>
            {/each}
        </div>
    {/if}
</div>
