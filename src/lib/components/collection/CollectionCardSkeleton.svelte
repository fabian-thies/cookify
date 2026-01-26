<script lang="ts">
    import * as Card from "$lib/components/ui/card";
</script>

<Card.Root class="flex flex-col overflow-hidden rounded-lg bg-card p-4 gap-4 shadow-sm border border-border/50">
    <Card.Header class="relative h-42 overflow-hidden p-0 rounded-lg">
        <div class="absolute inset-0 h-full w-full bg-muted animate-pulse"></div>
    </Card.Header>
    <Card.Content class="flex-1 p-0">
        <div class="flex gap-2">
            {#each Array(3) as _}
                <div class="flex-1 overflow-hidden rounded-lg bg-muted aspect-3/2 animate-pulse">
                </div>
            {/each}
        </div>
        <div class="flex justify-between mt-5">
            <div class="h-6 bg-muted rounded w-32 animate-pulse"></div>
            <div class="h-5 bg-muted rounded w-12 animate-pulse"></div>
        </div>
    </Card.Content>
</Card.Root>
