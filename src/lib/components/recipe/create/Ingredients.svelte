<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {BookOpen, ChefHat, Minus, Plus} from "lucide-svelte";

    type Ingredient = {
        amount: string,
        unit: string,
        ingredient: string
    }

    let ingredients: Ingredient[] = [{amount: "", unit: "", ingredient: ""}];

    const addIngredient = () => {
        ingredients = [...ingredients, {amount: "", unit: "", ingredient: ""}];
    }

    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            ingredients = ingredients.filter((_, i) => i !== index);
        }
    }
</script>

{#snippet ingredientRow(item: Ingredient, index: number)}
    <div class="flex flex-row gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="amount-{index}">Menge</Label>
            <Input type="text" id="amount-{index}" bind:value={item.amount} placeholder="z.B. 500" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="unit-{index}">Einheit</Label>
            <Input type="text" id="unit-{index}" bind:value={item.unit} placeholder="z.B. Gramm, ml, Stück" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="ingredient-{index}">Zutat</Label>
            <Input type="text" id="ingredient-{index}" bind:value={item.ingredient} placeholder="z.B. Nudeln, Eier, Speck" />
        </div>
        <div class="flex w-full max-w-10 flex-col gap-1.5">
            <Label>&nbsp;</Label>
            <Button
                    variant="outline"
                    class="hover:cursor-pointer"
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
        <Button variant="outline" class="w-full hover:cursor-pointer" onclick={addIngredient}>
            <Plus />Zutat hinzufügen
        </Button>
    </Card.Footer>
</Card.Root>