<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Textarea} from "$lib/components/ui/textarea";
    import {Plus, Trash} from "lucide-svelte";
    import {onMount} from "svelte";
    import type {Step} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages";

    const {steps: stepsProp = []} = $props();

    let steps: Step[] = $state(stepsProp);

    const addStep = () => {
        steps = [...steps, {number: steps.length + 1, step: ""} as Step];
    };

    const removeStep = (index: number) => {
        if (steps.length > 1) {
            steps = steps
                .filter((_, i) => i !== index)
                .map((it, i) => ({...it, number: i + 1}));
        }
    };

    onMount(() => {
        if (steps.length <= 0) addStep();
    });
</script>

{#snippet instructionRow(item: Step, index: number)}
    <div class="flex flex-row gap-6">
        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <div class="flex flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full items-center justify-center text-sm font-medium">
                {index + 1}
            </div>
        </div>

        <div class="flex w-full flex-col gap-1.5">
            <Label for="instructions-{index}-description">{m["recipe.form.steps.stepLabel"]()}</Label>
            <Textarea
                    id="instructions-{index}-description"
                    name="instructions_description[]"
                    bind:value={item.step}
                    placeholder={m["recipe.form.steps.stepPlaceholder"]()}
                    required
            />
            <input type="hidden" name="instructions_step[]" value={item.number}/>
        </div>

        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <Button
                    type="button"
                    variant="outline"
                    class="hover:cursor-pointer"
                    disabled={steps.length === 1}
                    onclick={() => removeStep(index)}
            >
                <Trash/>
            </Button>
        </div>
    </div>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            <h2>
                {m["recipe.form.steps.title"]()}
            </h2>
        </Card.Title>
    </Card.Header>

    <Card.Content class="flex flex-col gap-6">
        {#each steps as item, index (item.number)}
            {@render instructionRow(item, index)}
        {/each}
    </Card.Content>

    <Card.Footer>
        <Button
                class="w-full hover:cursor-pointer"
                onclick={addStep}
                type="button"
                variant="outline"
        >
            <Plus/>{m["recipe.form.steps.addButton"]()}
        </Button>
    </Card.Footer>
</Card.Root>
