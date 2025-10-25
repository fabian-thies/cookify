<script lang="ts">
import CollectionCard from "$lib/components/collection/CollectionCard.svelte";
import {getCollections} from "$lib/functions/recipe.remote";
import {m} from "$lib/paraglide/messages";

</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center mt-6 pt-4">
    {#each await getCollections() as {title, recipeCount, id, thumbnails} }
        <CollectionCard title={title} images={thumbnails} collectionId={id} recipeCount={recipeCount}/>
    {:else}
        <p class="col-span-full text-center text-muted-foreground">{m["collection.noCollections"]()}</p>
    {/each }
</div>
