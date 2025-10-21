<script lang="ts">
import CollectionCard from "$lib/components/collection/CollectionCard.svelte";
import {getCollections} from "$lib/functions/recipe.remote";
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
    {#each await getCollections() as {title, recipeCount, id} }
        <CollectionCard title={title} image="/uploads/29ab00a0-ba19-4524-b0e0-260584bf43a1.png" collectionId={id} recipeCount={recipeCount}/>
    {/each }
</div>
