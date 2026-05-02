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
    <Card.Root class="w-full mt-6">
        <Card.Header class="flex items-center gap-4">
            <Card.Title class="flex flex-col gap-2">
                <h1 class="text-lg font-bold flex items-center gap-2">
                    <Lightbulb/>
                    {m["recipe.view.tips.title"]()}
                </h1>
                <p class="text-sm text-muted-foreground">{m["recipe.view.tips.subtitle"]()}</p>
            </Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-4">
            {#each tips as tip}
                <div class="flex gap-3 items-start bg-muted/50 rounded-lg p-3">
                    <Lightbulb class="w-4 h-4 mt-0.5 text-primary flex-shrink-0"/>
                    <span>{tip.tip}</span>
                </div>
            {/each}
        </Card.Content>
    </Card.Root>
{/if}
