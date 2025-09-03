<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {BookOpen, ChefHat, Copy, Minus, Plus} from "lucide-svelte";
    import {Textarea} from "$lib/components/ui/textarea";

    type Instruction = {
        step: number,
        description: string
    }

    let instructions: Instruction[] = [{step: 1, description: ""}];

    const addInstruction = () => {
        instructions = [...instructions, {step: instructions.length + 1, description: ""}]
    }

    const removeInstruction = (index: number) => {
        if (instructions.length > 1) {
            instructions = instructions.filter((_, i) => i !== index)
        }
    }
</script>

{#snippet instructionRow(item: Instruction, index: number)}
    <div class="flex flex-row gap-6">
        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <div class="flex flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full items-center justify-center text-sm font-medium">
                {index + 1}
            </div>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="step-{index}">Schritt</Label>
            <Textarea id="step-{index}" bind:value={item.description} placeholder="z.B. Zwiebeln schälen und würfeln" />
        </div>
        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <Button
                    variant="outline"
                    class="hover:cursor-pointer"
                    disabled={instructions.length === 1}
                    onclick={() => removeInstruction(index)}
            >
                <Minus />
            </Button>
        </div>
    </div>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            Schritte
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        {#each instructions as item, index}
            {@render instructionRow(item, index)}
        {/each}
    </Card.Content>
    <Card.Footer>
        <Button variant="outline" class="w-full hover:cursor-pointer" onclick={addInstruction}>
            <Plus />Schritt hinzufügen
        </Button>
    </Card.Footer>
</Card.Root>