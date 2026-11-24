<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Textarea} from "$lib/components/ui/textarea";
    import {ArrowDown, ArrowUp, GripVertical, Plus, Trash} from "lucide-svelte";
    import {onMount, untrack} from "svelte";
    import type {Step} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages";
    import {reorderList} from "$lib/list-order";

    const DRAG_MIME = "application/x-cookify-step";

    const {steps: stepsProp = []}: {steps?: any[]} = $props();

    type StepEntry = Step & { _key: number };

    let nextKey = 0;

    const normalizeSteps = (items: any[]): StepEntry[] =>
        items.map((item, index) => ({
            ...item,
            number: index + 1,
            _key: nextKey++
        }));

    const renumberSteps = (items: StepEntry[]): StepEntry[] =>
        items.map((item, index) => ({...item, number: index + 1}));

    let steps: StepEntry[] = $state(untrack(() => normalizeSteps(stepsProp)));
    let draggedIndex = $state<number | null>(null);
    let dragOverIndex = $state<number | null>(null);

    $effect(() => {
        if (stepsProp.length > 0) {
            steps = normalizeSteps(stepsProp);
        }
    });

    const addStep = () => {
        steps = [...steps, {number: steps.length + 1, step: "", _key: nextKey++} as StepEntry];
    };

    const removeStep = (index: number) => {
        if (steps.length > 1) {
            steps = renumberSteps(steps.filter((_, i) => i !== index));
        }
    };

    const moveStep = (fromIndex: number, toIndex: number) => {
        steps = renumberSteps(reorderList(steps, fromIndex, toIndex));
    };

    const handleDragStart = (event: DragEvent, index: number) => {
        if (steps.length <= 1) return;
        draggedIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(DRAG_MIME, String(index));
            const row = (event.currentTarget as HTMLElement | null)?.closest("[data-step-row]");
            if (row instanceof HTMLElement) {
                event.dataTransfer.setDragImage(row, 24, 24);
            }
        }
    };

    const handleDragOver = (event: DragEvent, index: number) => {
        if (draggedIndex === null) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
        dragOverIndex = index;
    };

    const handleDrop = (event: DragEvent, index: number) => {
        if (draggedIndex === null) return;
        event.preventDefault();
        if (draggedIndex !== index) {
            moveStep(draggedIndex, index);
        }
        draggedIndex = null;
        dragOverIndex = null;
    };

    const handleDragEnd = () => {
        draggedIndex = null;
        dragOverIndex = null;
    };

    onMount(() => {
        if (steps.length <= 0) addStep();
    });
</script>

{#snippet instructionRow(item: StepEntry, index: number)}
    <div
            data-step-row
            role="listitem"
            class="flex flex-row gap-2 rounded-lg transition-colors sm:gap-3 {draggedIndex === index ? 'opacity-50' : ''} {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index ? 'ring-2 ring-primary/50 bg-accent/30' : ''}"
            ondragover={(event) => handleDragOver(event, index)}
            ondragleave={() => { if (dragOverIndex === index) dragOverIndex = null; }}
            ondrop={(event) => handleDrop(event, index)}
    >
        <div class="flex shrink-0 flex-col items-center gap-1.5">
            <Label>&nbsp;</Label>
            <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {index + 1}
            </div>
            <div
                    aria-hidden="true"
                    title={m["actions.reorder"]()}
                    draggable={steps.length > 1}
                    ondragstart={(event) => handleDragStart(event, index)}
                    ondragend={handleDragEnd}
                    class="hidden size-7 items-center justify-center rounded-md text-muted-foreground transition-colors sm:flex {steps.length > 1 ? 'cursor-grab hover:bg-accent hover:text-foreground active:cursor-grabbing' : 'opacity-30'}"
            >
                <GripVertical class="size-4"/>
            </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
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

        <div class="flex shrink-0 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <div class="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
                <Button
                        aria-label={m["actions.moveUp"]() + ": " + m["recipe.form.steps.stepLabel"]() + " " + (index + 1)}
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-8 sm:size-9"
                        disabled={index === 0}
                        onclick={() => moveStep(index, index - 1)}
                >
                    <ArrowUp/>
                </Button>
                <Button
                        aria-label={m["actions.moveDown"]() + ": " + m["recipe.form.steps.stepLabel"]() + " " + (index + 1)}
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-8 sm:size-9"
                        disabled={index === steps.length - 1}
                        onclick={() => moveStep(index, index + 1)}
                >
                    <ArrowDown/>
                </Button>
                <Button
                        aria-label={m["actions.delete"]() + ": " + m["recipe.form.steps.stepLabel"]() + " " + (index + 1)}
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-8 sm:size-9"
                        disabled={steps.length === 1}
                        onclick={() => removeStep(index)}
                >
                    <Trash/>
                </Button>
            </div>
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

    <Card.Content role="list" class="flex flex-col gap-6">
        {#each steps as item, index (item._key)}
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
