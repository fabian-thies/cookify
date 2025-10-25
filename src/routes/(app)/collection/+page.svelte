<script lang="ts">
import CollectionCard from "$lib/components/collection/CollectionCard.svelte";
import {getCollections} from "$lib/functions/recipe.remote";

</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
    {#each await getCollections() as {title, recipeCount, id, thumbnails} }
        <CollectionCard title={title} images={thumbnails} collectionId={id} recipeCount={recipeCount}/>
    {/each }
</div>
