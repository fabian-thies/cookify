<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Textarea} from "$lib/components/ui/textarea";
    import {m} from "$lib/paraglide/messages";
    import {Plus} from "lucide-svelte";

    type StepParam = {
        id: number,
        step: string,
        number: number
    };

    const {steps} = $props<{
        steps: StepParam[];
    }>();
</script>
{#snippet Step({id, step, number}: StepParam)}
    <li class="flex gap-3 py-4 sm:gap-4">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold tabular-nums text-primary">
            {number}
        </span>
        <p class="pt-0.5 text-[15px] leading-relaxed">{step}</p>
    </li>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="border-b border-border/60 pb-4">
        <Card.Title class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">{m["recipe.view.preparation.title"]()}</h2>
            <p class="text-sm font-normal text-muted-foreground">{m["recipe.view.preparation.subtitle"]()}</p>
        </Card.Title>
    </Card.Header>
    <Card.Content>
        <ol class="divide-y divide-border/50">
            {#each steps as step}
                {@render Step(step)}
            {/each}
        </ol>
    </Card.Content>
</Card.Root>