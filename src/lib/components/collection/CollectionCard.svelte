<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import {Bookmark, ImageIcon} from "lucide-svelte";

    type Props = {
        collectionId: number;
        title: string;
        images: string[];
        recipeCount: number;
    };

    let {collectionId, title, images, recipeCount}: Props = $props();
</script>

<a href="/collection/{collectionId}" class="w-full h-full group">
    <Card.Root class="flex flex-col overflow-hidden rounded-lg bg-card p-4 gap-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30">
        <Card.Header class="relative h-42 overflow-hidden p-0 rounded-lg">
            {#if images && images.length > 0}
                <img alt={title} class="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src={images[0]} loading="lazy">
            {:else}
                <div class="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                    <ImageIcon size={32}/>
                </div>
            {/if}
        </Card.Header>
        <Card.Content class="flex-1 p-0">
            <div class="flex gap-2">
                {#each Array.from({length: 3}, (_, i) => images?.[i + 1] ?? null) as thumb}
                    <div class="flex-1 overflow-hidden rounded-lg bg-muted aspect-3/2">
                        {#if thumb}
                            <img alt="" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src={thumb} loading="lazy">
                        {:else}
                            <div class="h-full w-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon size={18}/>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="flex justify-between mt-5 items-center">
                <h1 class="font-bold tracking-wide text-lg text-card-foreground group-hover:text-primary transition-colors duration-200">{title}</h1>
                <span class="text-sm text-muted-foreground flex flex-row gap-1.5 items-center">
                    <Bookmark size={16} class="text-primary"/>
                    <span class="font-medium">{recipeCount}</span>
                </span>
            </div>
        </Card.Content>
    </Card.Root>
</a>