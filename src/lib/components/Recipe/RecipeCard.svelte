<script lang="ts">
    import type {RecipePreview} from "$lib/types/recipe/recipe";

    export let recipe: RecipePreview;
</script>

<section class="max-w-xs">
    <a aria-label="{recipe.title} anzeigen" href="/recipe/{recipe.id}">
        <img
                alt={recipe.title}
                class="rounded-lg"
                src={recipe.imageUrl}
        />
    </a>
    <div class="mt-5">
        <a aria-label={recipe.title} href="/recipe/">
            <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {recipe.title}
            </h2>
        </a>
        <p class="text-sm mt-2 text-subtitle-light dark:text-subtitle-dark">
            {recipe.description}
        </p>
    </div>
</section>