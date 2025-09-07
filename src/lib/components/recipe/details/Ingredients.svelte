<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";

    const { servings, ingredients } = $props<{
        servings: number;
        ingredients: { id: number; name: string; quantity: number; unit: string }[];
    }>();

    type IngredientParam = {
        name: string;
        quantity: number | string;
        unit: string;
    };
</script>

{#snippet IngredientItem({ name, quantity, unit }: IngredientParam)}
    <li class="flex items-start gap-3 py-1">
    <span class="font-semibold text-primary min-w-[60px] text-sm">
      {quantity}{unit ? ` ${unit}` : ''}
    </span>
        <span class="text-sm">{name}</span>
    </li>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="flex flex-col gap-2">
            <h1 class="text-lg font-bold">Zutaten</h1>
            <p class="text-sm text-muted-foreground">Für {servings} Portionen</p>
        </Card.Title>
    </Card.Header>

    <Card.Content class="flex flex-col gap-6">
        <ul class="space-y-3">
            {#each ingredients ?? [] as ing}
                {@render IngredientItem({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit
                })}
            {/each}
        </ul>
    </Card.Content>

    <Card.Footer />
</Card.Root>