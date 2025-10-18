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
    <div class="flex flex-row gap-6">
        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <div class="flex flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full items-center justify-center text-sm font-medium">
                {number}
            </div>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            {step}
        </div>
    </div>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="flex flex-col gap-2">
            <h1 class="text-lg font-bold">
                {m["recipe.view.preparation.title"]()}
            </h1>
            <p class="text-sm text-muted-foreground">{m["recipe.view.preparation.subtitle"]()}</p>
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        {#each steps as step }
            {@render Step(step)}
        {/each}
    </Card.Content>
    <Card.Footer>
    </Card.Footer>
</Card.Root>