<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Plus, Trash} from "lucide-svelte";
    import {onMount} from "svelte";
    import {m} from "$lib/paraglide/messages";
    import type {Ingredient} from "$lib/server/db/schema";

    const {recipe, ingredients: ingredientsProp = []} = $props();

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
            {id: null, recipeId: recipe?.id, name: "", quantity: null, unit: ""}
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
            <Label for="ingredients-{index}-amount">{m["recipe.form.ingredients.quantityLabel"]()}</Label>
            <Input
                    type="number"
                    id="ingredients-{index}-amount"
                    name="ingredients_amount[]"
                    bind:value={item.quantity}
                    placeholder={m["recipe.form.ingredients.quantityPlaceholder"]()}
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
                    placeholder={m["recipe.form.ingredients.unitPlaceholder"]()}
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
                    placeholder={m["recipe.form.ingredients.namePlaceholder"]()}
                    required
            />
        </div>
        <div class="flex w-full md:max-w-10 flex-col gap-x-1.5 justify-end">
            <Button
                    variant="outline"
                    class="hover:cursor-pointer"
                    type="button"
                    disabled={ingredients.length === 1}
                    onclick={() => removeIngredient(index)}
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
                {m["recipe.form.ingredients.title"]()}
            </h2>
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        {#each ingredients as item, index}
            {@render ingredientRow(item, index)}
        {/each}
    </Card.Content>
    <Card.Footer>
        <Button class="w-full hover:cursor-pointer" onclick={addIngredient} type="button" variant="outline">
            <Plus/>{m["recipe.form.ingredients.addButton"]()}
        </Button>
    </Card.Footer>
</Card.Root>
