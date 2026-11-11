<script lang="ts">
    import {Bookmark, ChevronRight, ImageIcon} from "lucide-svelte";

    type Props = {
        collectionId: number;
        title: string;
        images: string[];
        recipeCount: number;
    };

    let {collectionId, title, images, recipeCount}: Props = $props();
</script>

<a
        class="group flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-border hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href="/collection/{collectionId}"
>
    <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
        {#if images && images.length > 0}
            <img
                    alt={title}
                    class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    loading="lazy"
                    src={images[0]}
            >
        {:else}
            <div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon class="size-7"/>
            </div>
        {/if}
        <span class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/75 px-2 py-0.5 text-[11px] font-medium backdrop-blur-md">
            <Bookmark class="size-3 text-primary"/>
            {recipeCount}
        </span>
    </div>
    <div class="flex items-center justify-between gap-2 px-0.5 pb-0.5">
        <h3 class="truncate text-[15px] font-medium tracking-tight">{title}</h3>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"/>
    </div>
</a>
