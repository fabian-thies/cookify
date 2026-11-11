<script lang="ts">
    import {ChevronRight, ImageIcon} from "lucide-svelte";

    import {m} from "$lib/paraglide/messages";

    type Props = {
        collectionId: number;
        title: string;
        images: string[];
        recipeCount: number;
    };

    let {collectionId, title, images, recipeCount}: Props = $props();
</script>

<a
        class="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-colors hover:border-border hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href="/collection/{collectionId}"
>
    <div class="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {#if images && images.length > 0}
            <img
                    alt=""
                    class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                    loading="lazy"
                    src={images[0]}
            >
        {:else}
            <div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon class="size-7"/>
            </div>
        {/if}
    </div>
    <div class="flex flex-1 items-center justify-between gap-4 p-4 sm:p-5">
        <div class="min-w-0">
            <h3 class="break-words text-lg font-semibold leading-snug tracking-tight">{title}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{recipeCount} {m["nav.recipes"]()}</p>
        </div>
        <ChevronRight aria-hidden="true" class="size-5 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"/>
    </div>
</a>
