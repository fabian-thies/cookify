<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import {m} from "$lib/paraglide/messages";
    import {TriangleAlert} from "lucide-svelte";

    const {message = m["actions.error"](), onRetry}: { message?: string; onRetry?: () => void } = $props();
</script>

<div class="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card px-6 py-12 text-center">
    <div class="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert class="size-5 text-destructive"/>
    </div>
    <p class="max-w-sm text-sm text-muted-foreground">{message}</p>
    {#if onRetry}
        <Button onclick={onRetry} size="sm" variant="outline">{m["actions.retry"]()}</Button>
    {/if}
</div>
