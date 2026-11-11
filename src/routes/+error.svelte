<script lang="ts">
    import {page} from "$app/state";
    import {Button} from "$lib/components/ui/button";
    import {m} from "$lib/paraglide/messages";
    import {SearchX, TriangleAlert} from "lucide-svelte";

    const notFound = $derived(page.status === 404);
</script>

<div class="flex min-h-[70dvh] items-center justify-center px-4">
    <div class="flex max-w-sm flex-col items-center gap-4 text-center">
        <div class="flex size-14 items-center justify-center rounded-full bg-muted">
            {#if notFound}
                <SearchX class="size-6 text-muted-foreground"/>
            {:else}
                <TriangleAlert class="size-6 text-destructive"/>
            {/if}
        </div>
        <div class="space-y-1.5">
            <h1 class="page-title">
                {notFound ? m["error.notFoundTitle"]() : m["error.title"]()}
            </h1>
            <p class="text-sm text-muted-foreground">
                {notFound ? m["error.notFoundText"]() : (page.error?.message ?? m["error.text"]())}
            </p>
        </div>
        <Button href="/">{m["error.home"]()}</Button>
    </div>
</div>
