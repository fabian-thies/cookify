<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Minus, Plus} from "lucide-svelte";
    import {onMount} from "svelte";
    import type {Ingredient} from "$lib/server/db/schema";

    const { recipe, ingredients: ingredientsProp = [] } = $props();

    type IngredientDraft = {
        id: number | null;
        recipeId: number;
        name: string;
        quantity: number | null;
        unit: string;
    };

    type IngredientLike = Ingredient | IngredientDraft;

    let ingredients: IngredientLike[] = $state(ingredientsProp);

    const addIngredient = () => {
        ingredients = [
            ...ingredients,
            { id: null, recipeId: recipe?.id, name: "", quantity: null, unit: "" }
        ];
    };

    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            ingredients = ingredients.filter((_, i) => i !== index);
        }
    };

    onMount(() => {
        if (ingredients.length <= 0) addIngredient();
    });
</script>

{#snippet ingredientRow(item: IngredientLike, index: number)}
    <div class="flex flex-col md:flex-row gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="ingredients-{index}-amount">Menge</Label>
            <Input
                    type="number"
                    id="ingredients-{index}-amount"
                    name="ingredients_amount[]"
                    bind:value={item.quantity}
                    placeholder="z.B. 500"
                    required
            />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="ingredients-{index}-unit">Einheit</Label>
            <Input
                    type="text"
                    id="ingredients-{index}-unit"
                    name="ingredients_unit[]"
                    bind:value={item.unit}
                    placeholder="z.B. g, ml, Stück"
                    required
            />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="ingredients-{index}-ingredient">Zutat</Label>
            <Input
                    type="text"
                    id="ingredients-{index}-ingredient"
                    name="ingredients_name[]"
                    bind:value={item.name}
                    placeholder="z.B. Nudeln, Eier, Speck"
                    required
            />
        </div>
        <div class="flex w-full md:max-w-10 flex-col gap-x-1.5">
            <Label>&nbsp;</Label>
            <Button
                    variant="outline"
                    class="hover:cursor-pointer"
                    type="button"
                    disabled={ingredients.length === 1}
                    onclick={() => removeIngredient(index)}
            >
                <Minus />
            </Button>
        </div>
    </div>
{/snippet}

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            Zutaten
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        {#each ingredients as item, index}
            {@render ingredientRow(item, index)}
        {/each}
    </Card.Content>
    <Card.Footer>
        <Button type="button" variant="outline" class="w-full hover:cursor-pointer" onclick={addIngredient}>
            <Plus />Zutat hinzufügen
        </Button>
    </Card.Footer>
</Card.Root>
