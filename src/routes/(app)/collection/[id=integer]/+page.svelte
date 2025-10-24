<script>
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";

    const {data} = $props();
</script>

<RecipeList recipes={data.collection.recipes} title={data.collection.collectionTitle} showFilters={false}/>
