<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {m} from "$lib/paraglide/messages";
    import {Minus, Plus} from "lucide-svelte";
    import {MAX_SERVINGS, scaleIngredientQuantity} from "$lib/servings";

    let {servings, ingredients, desiredServings = $bindable() } = $props<{
        servings: number;
        ingredients: { id: number; name: string; quantity: number; unit: string }[];
        desiredServings?: number;
    }>();

    type IngredientParam = {
        name: string;
        quantity: number | string;
        unit: string;
    };

    const displayedServings = $derived(desiredServings ?? servings);

    function clampServings(value: number) {
        if (!Number.isFinite(value) || value <= 0) return 1;
        if (value > MAX_SERVINGS) return MAX_SERVINGS;
        return Math.round(value);
    }

    function changeServings(delta: number) {
        desiredServings = clampServings(displayedServings + delta);
    }

    function onServingsInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const next = Number(target.value);
        desiredServings = clampServings(next);
    }

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
            <p class="text-sm font-normal text-muted-foreground">{m["recipe.common.forServings"]({count: displayedServings})}</p>
        </Card.Title>
        <div class="flex items-center gap-1 rounded-full border border-border/70 bg-background/40 p-0.5">
            <Button aria-label={m["recipe.common.decreaseServings"]()} type="button" variant="ghost" class="size-8 rounded-full px-0" onclick={() => changeServings(-1)}>
                <Minus class="size-3.5"/>
            </Button>
            <Input
                    aria-label={m["recipe.common.forServings"]({count: displayedServings})}
                    type="number"
                    class="h-8 w-10 border-0 bg-transparent px-0 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                    max={MAX_SERVINGS}
                    step="1"
                    value={displayedServings}
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
                    quantity: scaleIngredientQuantity(ing.quantity ?? 0, servings, displayedServings),
                    unit: ing.unit
                })}
            {/each}
        </ul>
    </Card.Content>
</Card.Root>
