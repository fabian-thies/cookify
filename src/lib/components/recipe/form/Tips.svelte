<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Textarea} from "$lib/components/ui/textarea";
    import {Plus, Trash} from "lucide-svelte";
    import type {Tip} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages";

    const {tips: tipsProp = []}: {tips?: any[]} = $props();

    type TipDraft = { id: number | null; recipeId: number; tip: string };
    let tips: TipDraft[] = $state(tipsProp.length > 0 ? tipsProp : [{id: null, recipeId: 0, tip: ""} as TipDraft]);

    $effect(() => {
        if (tipsProp.length > 0) {
            tips = tipsProp;
        }
    });

    const addTip = () => {
        tips = [...tips, {id: null, recipeId: 0, tip: ""} as TipDraft];
    };

    const removeTip = (index: number) => {
        tips = tips.filter((_, i) => i !== index);
    };

</script>

{#snippet tipRow(item: TipDraft, index: number)}
    <div class="flex flex-row gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="tips-{index}-description">{m["recipe.form.tips.tipLabel"]()}</Label>
            <Textarea
                    id="tips-{index}-description"
                    name="tips[]"
                    bind:value={item.tip}
                    placeholder={m["recipe.form.tips.tipPlaceholder"]()}
            />
        </div>

        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <Button
                    type="button"
                    variant="outline"
                    class="hover:cursor-pointer"
                    onclick={() => removeTip(index)}
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
                {m["recipe.form.tips.title"]()}
            </h2>
        </Card.Title>
    </Card.Header>

    <Card.Content class="flex flex-col gap-6">
        {#each tips as item, index}
            {@render tipRow(item, index)}
        {/each}
    </Card.Content>

    <Card.Footer>
        <Button
                class="w-full hover:cursor-pointer"
                onclick={addTip}
                type="button"
                variant="outline"
        >
            <Plus/>{m["recipe.form.tips.addButton"]()}
        </Button>
    </Card.Footer>
</Card.Root>
