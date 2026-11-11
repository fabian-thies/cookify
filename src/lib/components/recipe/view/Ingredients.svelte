<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {m} from "$lib/paraglide/messages";
    import {Minus, Plus} from "lucide-svelte";

    const {servings, ingredients} = $props<{
        servings: number;
        ingredients: { id: number; name: string; quantity: number; unit: string }[];
    }>();

    type IngredientParam = {
        name: string;
        quantity: number | string;
        unit: string;
    };

    // --- servings ---
    let desiredServings = $state<number>(servings);

    function clampServings(value: number) {
        if (!Number.isFinite(value) || value <= 0) return 1;
        if (value > 999) return 999;
        return Math.round(value);
    }

    function changeServings(delta: number) {
        desiredServings = clampServings((desiredServings ?? servings) + delta);
    }

    function onServingsInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const next = Number(target.value);
        desiredServings = clampServings(next);
    }

    function formatQuantity(value: number) {
        if (!Number.isFinite(value)) return "";
        const rounded = Math.round(value * 100) / 100; // 2 decimals max
        if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
        return String(rounded).replace(/\.0+$/, "").replace(/(\.[1-9]*)0+$/, "$1");
    }

    const factor = $derived(servings > 0 ? desiredServings / servings : 1);
</script>

{#snippet IngredientItem({name, quantity, unit}: IngredientParam)}
    <li class="flex items-baseline gap-3 py-2.5">
        <span class="min-w-16 text-sm font-semibold tabular-nums text-primary">
            {quantity}{unit ? ` ${unit}` : ''}
        </span>
        <span class="text-sm leading-relaxed">{name}</span>
    </li>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex flex-row items-center justify-between gap-4 border-b border-border/60 pb-4">
        <Card.Title class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">{m["recipe.common.ingredients"]()}</h2>
            <p class="text-sm font-normal text-muted-foreground">{m["recipe.common.forServings"]({count: desiredServings})}</p>
        </Card.Title>
        <div class="flex items-center gap-1 rounded-full border border-border/70 bg-background/40 p-0.5">
            <Button aria-label={m["recipe.common.decreaseServings"]()} type="button" variant="ghost" class="size-8 rounded-full px-0" onclick={() => changeServings(-1)}>
                <Minus class="size-3.5"/>
            </Button>
            <Input
                    aria-label={m["recipe.common.forServings"]({count: desiredServings})}
                    type="number"
                    class="h-8 w-10 border-0 bg-transparent px-0 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                    max="999"
                    step="1"
                    value={desiredServings}
                    oninput={onServingsInput}
            />
            <Button aria-label={m["recipe.common.increaseServings"]()} type="button" variant="ghost" class="size-8 rounded-full px-0" onclick={() => changeServings(1)}>
                <Plus class="size-3.5"/>
            </Button>
        </div>
    </Card.Header>

    <Card.Content>
        <ul class="divide-y divide-border/50">
            {#each ingredients ?? [] as ing}
                {@render IngredientItem({
                    name: ing.name,
                    quantity: formatQuantity((ing.quantity ?? 0) * factor),
                    unit: ing.unit
                })}
            {/each}
        </ul>
    </Card.Content>
</Card.Root>
