<script lang="ts">
    import type {RecipePreview} from "$lib/types/recipe/recipe";
    import RecipeList from "$lib/components/Recipe/RecipeList.svelte";

    const testRecipe: RecipePreview = {
        id: "1",
        title: "Test Recipe",
        description: "This is a test recipe",
        imageUrl: "https://placehold.co/600x400",
        cookingTime: 30,
        rating: 4.5,
        difficulty: "easy"
    };

    const testRecipes: RecipePreview[] = [
        testRecipe,
        testRecipe,
        testRecipe,
        testRecipe,
        testRecipe,
        testRecipe,
        testRecipe
    ];
</script>

<RecipeList recipes={testRecipes}>

</RecipeList>