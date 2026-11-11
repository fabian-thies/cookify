<script lang="ts">
    import {ChevronRight, ImageIcon} from "lucide-svelte";

    import {m} from "$lib/paraglide/messages";
    import {imageVariantUrl, isUploadedImage} from "$lib/images";

    type Props = {
        collectionId: number;
        title: string;
        images: string[];
        recipeCount: number;
    };

    let {collectionId, title, images, recipeCount}: Props = $props();

    const cover = $derived(images?.[0] ?? "");
    const coverSrcset = $derived(isUploadedImage(cover)
        ? `${imageVariantUrl(cover, "thumb")} 480w, ${imageVariantUrl(cover, "medium")} 960w`
        : undefined);
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
                    decoding="async"
                    loading="lazy"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={imageVariantUrl(cover, "thumb")}
                    srcset={coverSrcset}
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
