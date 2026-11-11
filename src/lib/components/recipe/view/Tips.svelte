<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import {m} from "$lib/paraglide/messages";
    import {Lightbulb} from "lucide-svelte";

    type TipParam = {
        id: number;
        tip: string;
        recipeId: number;
    };

    const {tips}: {tips: TipParam[]} = $props();
</script>

{#if tips.length > 0}
    <Card.Root class="mt-4 w-full sm:mt-6">
        <Card.Header class="border-b border-border/60 pb-4">
            <Card.Title class="flex flex-col gap-1">
                <h2 class="flex items-center gap-2 text-base font-semibold">
                    <Lightbulb class="size-4 text-primary"/>
                    {m["recipe.view.tips.title"]()}
                </h2>
                <p class="text-sm font-normal text-muted-foreground">{m["recipe.view.tips.subtitle"]()}</p>
            </Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-2">
            {#each tips as tip}
                <div class="flex items-start gap-3 rounded-lg bg-accent/40 p-3">
                    <Lightbulb class="mt-0.5 size-4 shrink-0 text-primary"/>
                    <span class="text-sm leading-relaxed">{tip.tip}</span>
                </div>
            {/each}
        </Card.Content>
    </Card.Root>
{/if}
