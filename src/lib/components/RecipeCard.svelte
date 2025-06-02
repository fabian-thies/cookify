<script lang="ts">
    import Icon from "@iconify/svelte";
    import {UPLOAD_DIR} from "$lib/client/config";

    let {
        id,
        image,
        title,
        description,
        categories = [],
        href = '#',
        cookTime = null,
        difficulty = "Einfach",
        rating = 0,
        servings = 1,
        saved,
    } = $props();

    let isSaved = $state(saved);

    async function toggleSave() {
        const response = await fetch(`/api/v1/recipes/${id}/save`, {
            method: 'POST',
            body: JSON.stringify({title}),
            headers: {'Content-Type': 'application/json'}
        });

        if (response.ok) {
            isSaved = !isSaved;
        }
    }

    function getDifficultyColor(difficulty: string) {
        switch (difficulty) {
            case "Einfach":
                return "badge-success";
            case "Mittel":
                return "badge-warning";
            case "Schwer":
                return "badge-error";
            default:
                return "badge-neutral";
        }
    }
</script>

<div class="card bg-base-100 shadow-sm hover:shadow-lg transition-shadow duration-200 border border-base-300">
    <figure class="relative">
        {#if image}
            <img
                    src={UPLOAD_DIR + image}
                    alt={title}
                    class="w-full h-48 object-cover"
            />
        {:else}
            <div class="w-full h-48 bg-base-200 flex items-center justify-center">
                <span class="text-base-content/50">Kein Bild</span>
            </div>
        {/if}
        <div class="absolute top-2 right-2">
            <div class={`badge ${getDifficultyColor(difficulty)} badge-sm font-medium`}>
                {difficulty}
            </div>
        </div>
    </figure>

    <div class="card-body p-4">
        <h3 class="card-title text-lg mb-2 line-clamp-1">{title}</h3>
        <p class="text-base-content/70 text-sm mb-3 line-clamp-2">{description}</p>

        <div class="flex items-center justify-between text-sm text-base-content/60 mb-3">
            <div class="flex items-center gap-1">
                <Icon icon="lucide:clock" class="h-4 w-4"/>
                <span>{cookTime} Min</span>
            </div>
            <div class="flex items-center gap-1">
                <Icon icon="lucide:users" class="h-4 w-4"/>
                <span>{servings} Portionen</span>
            </div>
            <div class="flex items-center gap-1">
                <Icon icon="lucide:star" class="h-4 w-4 text-warning"/>
                <span>{rating}</span>
            </div>
        </div>

        <!-- Tags -->
        <!--        <div class="flex flex-wrap gap-1 mb-3">-->
        <!--            {#each tags.slice(0, 2) as tag}-->
        <!--                <div class="badge badge-secondary badge-sm">-->
        <!--                    {tag}-->
        <!--                </div>-->
        <!--            {/each}-->
        <!--            {#if tags.length > 2}-->
        <!--                <div class="badge badge-secondary badge-sm">-->
        <!--                    +{tags.length - 2}-->
        <!--                </div>-->
        <!--            {/if}-->
        <!--        </div>-->

        <div class="card-actions justify-end">
            <a
                    {href}
                    class="btn btn-neutral w-full"
            >
                Rezept ansehen
            </a>
        </div>
    </div>
</div>

<style>
    .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
