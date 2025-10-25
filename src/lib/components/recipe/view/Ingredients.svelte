<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {m} from "$lib/paraglide/messages";

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
    <li class="flex items-start gap-3 py-1">
    <span class="font-semibold text-primary min-w-[60px] text-sm">
      {quantity}{unit ? ` ${unit}` : ''}
    </span>
        <span class="text-sm">{name}</span>
    </li>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center justify-between gap-4">
        <Card.Title class="flex flex-col gap-2">
            <h1 class="text-lg font-bold">{m["recipe.common.ingredients"]()}</h1>
            <p class="text-sm text-muted-foreground">{m["recipe.common.forServings"]({count: desiredServings})}</p>
        </Card.Title>
        <div class="flex items-center gap-2">
            <Button type="button" variant="outline" class="h-8 w-8 px-0" onclick={() => changeServings(-1)}>-</Button>
            <Input
                    type="number"
                    class="h-8 w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                    max="999"
                    step="1"
                    value={desiredServings}
                    oninput={onServingsInput}
            />
            <Button type="button" variant="outline" class="h-8 w-8 px-0" onclick={() => changeServings(1)}>+</Button>
        </div>
    </Card.Header>

    <Card.Content class="flex flex-col gap-6">
        <ul class="space-y-3">
            {#each ingredients ?? [] as ing}
                {@render IngredientItem({
                    name: ing.name,
                    quantity: formatQuantity((ing.quantity ?? 0) * factor),
                    unit: ing.unit
                })}
            {/each}
        </ul>
    </Card.Content>

    <Card.Footer/>
</Card.Root>
