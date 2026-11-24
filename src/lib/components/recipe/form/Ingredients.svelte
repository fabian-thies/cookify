<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {ArrowDown, ArrowUp, GripVertical, Plus, Trash} from "lucide-svelte";
    import {onMount, untrack} from "svelte";
    import {m} from "$lib/paraglide/messages";
    import {reorderList} from "$lib/list-order";
    import type {Ingredient} from "$lib/server/db/schema";

    const DRAG_MIME = "application/x-cookify-ingredient";

    const {recipe, ingredients: ingredientsProp = []}: {recipe?: any; ingredients?: any[]} = $props();

    type IngredientDraft = {
        id: number | null;
        recipeId: number;
        name: string;
        quantity: number | null;
        unit: string;
    };

    type IngredientEntry = (Ingredient | IngredientDraft) & { _key: number };

    let nextKey = 0;

    const normalizeIngredients = (items: any[]): IngredientEntry[] =>
        items.map((item) => ({
            ...item,
            quantity: item?.quantity ?? null,
            unit: item?.unit ?? "",
            _key: nextKey++
        }));

    let ingredients: IngredientEntry[] = $state(untrack(() => normalizeIngredients(ingredientsProp)));
    let draggedIndex = $state<number | null>(null);
    let dragOverIndex = $state<number | null>(null);

    $effect(() => {
        if (ingredientsProp.length > 0) {
            ingredients = normalizeIngredients(ingredientsProp);
        }
    });

    const addIngredient = () => {
        ingredients = [
            ...ingredients,
            {id: null, recipeId: recipe?.id, name: "", quantity: null, unit: "", _key: nextKey++}
        ];
    };

    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            ingredients = ingredients.filter((_, i) => i !== index);
        }
    };

    const moveIngredient = (fromIndex: number, toIndex: number) => {
        ingredients = reorderList(ingredients, fromIndex, toIndex);
    };

    const handleDragStart = (event: DragEvent, index: number) => {
        if (ingredients.length <= 1) return;
        draggedIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(DRAG_MIME, String(index));
            const row = (event.currentTarget as HTMLElement | null)?.closest("[data-ingredient-row]");
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
            moveIngredient(draggedIndex, index);
        }
        draggedIndex = null;
        dragOverIndex = null;
    };

    const handleDragEnd = () => {
        draggedIndex = null;
        dragOverIndex = null;
    };

    onMount(() => {
        if (ingredients.length <= 0) addIngredient();
    });
</script>

{#snippet ingredientRow(item: IngredientEntry, index: number)}
    <div
            data-ingredient-row
            role="listitem"
            class="grid grid-cols-2 gap-3 rounded-lg transition-colors md:flex md:flex-row md:items-end md:gap-3 {draggedIndex === index ? 'opacity-50' : ''} {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index ? 'ring-2 ring-primary/50 bg-accent/30' : ''}"
            ondragover={(event) => handleDragOver(event, index)}
            ondragleave={() => { if (dragOverIndex === index) dragOverIndex = null; }}
            ondrop={(event) => handleDrop(event, index)}
    >
        <div
                aria-hidden="true"
                title={m["actions.reorder"]()}
                draggable={ingredients.length > 1}
                ondragstart={(event) => handleDragStart(event, index)}
                ondragend={handleDragEnd}
                class="hidden h-10 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors md:flex {ingredients.length > 1 ? 'cursor-grab hover:bg-accent hover:text-foreground active:cursor-grabbing' : 'opacity-30'}"
        >
            <GripVertical class="size-4"/>
        </div>

        <div class="flex w-full flex-col gap-1.5 md:w-28 lg:w-32 md:shrink-0">
            <Label for="ingredients-{index}-amount">{m["recipe.form.ingredients.quantityLabel"]()}</Label>
            <Input
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="any"
                    id="ingredients-{index}-amount"
                    name="ingredients_amount[]"
                    bind:value={item.quantity}
                    placeholder={m["recipe.form.ingredients.quantityPlaceholder"]()}
            />
        </div>
        <div class="flex w-full flex-col gap-1.5 md:w-32 lg:w-36 md:shrink-0">
            <Label for="ingredients-{index}-unit">{m["recipe.form.ingredients.unitLabel"]()}</Label>
            <Input
                    type="text"
                    id="ingredients-{index}-unit"
                    name="ingredients_unit[]"
                    bind:value={item.unit}
                    placeholder={m["recipe.form.ingredients.unitPlaceholder"]()}
            />
        </div>
        <div class="col-span-2 flex w-full min-w-0 flex-col gap-1.5 md:flex-1">
            <Label for="ingredients-{index}-ingredient">{m["recipe.form.ingredients.nameLabel"]()}</Label>
            <Input
                    type="text"
                    id="ingredients-{index}-ingredient"
                    name="ingredients_name[]"
                    bind:value={item.name}
                    placeholder={m["recipe.form.ingredients.namePlaceholder"]()}
                    required
            />
        </div>
        <div class="col-span-2 flex items-center justify-end gap-1 md:shrink-0">
            <Button
                    aria-label={m["actions.moveUp"]() + ": " + m["recipe.form.ingredients.title"]() + " " + (index + 1)}
                    variant="ghost"
                    size="icon"
                    class="size-9"
                    type="button"
                    disabled={index === 0}
                    onclick={() => moveIngredient(index, index - 1)}
            >
                <ArrowUp/>
            </Button>
            <Button
                    aria-label={m["actions.moveDown"]() + ": " + m["recipe.form.ingredients.title"]() + " " + (index + 1)}
                    variant="ghost"
                    size="icon"
                    class="size-9"
                    type="button"
                    disabled={index === ingredients.length - 1}
                    onclick={() => moveIngredient(index, index + 1)}
            >
                <ArrowDown/>
            </Button>
            <Button
                    aria-label={m["actions.delete"]() + ": " + m["recipe.form.ingredients.title"]() + " " + (index + 1)}
                    variant="ghost"
                    size="icon"
                    class="size-9"
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
    <Card.Content role="list" class="flex flex-col gap-6">
        {#each ingredients as item, index (item._key)}
            {@render ingredientRow(item, index)}
        {/each}
    </Card.Content>
    <Card.Footer>
        <Button class="w-full hover:cursor-pointer" onclick={addIngredient} type="button" variant="outline">
            <Plus/>{m["recipe.form.ingredients.addButton"]()}
        </Button>
    </Card.Footer>
</Card.Root>
