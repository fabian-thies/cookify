<script lang="ts">
    import {UPLOAD_DIR} from "$lib/client/config";

    export let image: string;
    export let title: string;
    export let description: string;
    export let categories: string[] = [];
    export let href: string = '#';
</script>

<article class="card bg-base-100 shadow-xl hover:shadow-2xl transition">
    {#if image}
        <figure><img src={UPLOAD_DIR + image} alt={title} class="w-full h-48 object-cover"/></figure>
    {/if}
    <div class="card-body">
        <h3 class="card-title text-lg">{title}</h3>
        <p class="text-sm text-base-content/80 line-clamp-2">{description}</p>
        <div class="flex flex-wrap gap-2 mt-2">
            {#each categories as tag}
                <span class="badge badge-outline">{tag}</span>
            {/each}
        </div>
        <div class="card-actions justify-end mt-4">
            <a href={href} class="btn btn-sm btn-primary">Details</a>
        </div>
    </div>
</article>