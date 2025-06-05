<script lang="ts">
    import type {Ingredient} from "$lib/types";

    export let ingredients: Ingredient[] = [{name: "", quantity: ""}];
    export let error: string | undefined = undefined;

    function addIngredient() {
        ingredients = [...ingredients, {name: "", quantity: ""}];
    }

    function removeIngredient(index: number) {
        if (ingredients.length <= 1) {
            return;
        }

        ingredients = ingredients.filter((_, i) => i !== index);
    }
</script>

<fieldset class="bg-base-100 p-6 rounded-field space-y-4 {error ? 'border border-error' : ''}">
    <legend class="sr-only">Ingredients</legend>
    <label class="text-md font-medium text-base-content" for="ingredients">Ingredients</label>

    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}

    {#each ingredients as ingredient, index}
        <div class="space-y-3 mt-3">
            <div class="flex items-center gap-2">
                <input
                        name="ingredients-quantity-{index}"
                        type="text"
                        class="input input-bordered w-1/3 rounded-lg border-base-300 bg-base-200 focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Amount (e.g. 200g)"
                        bind:value={ingredient.quantity}
                />
                <input
                        name="ingredients-name-{index}"
                        type="text"
                        class="input input-bordered flex-grow rounded-lg border-base-300 bg-base-200 focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Ingredient (e.g. apple)"
                        bind:value={ingredient.name}
                />
                <button
                        type="button"
                        aria-label="Remove ingredient"
                        class="btn btn-circle btn-sm btn-ghost text-base-content/50 hover:bg-error/10 hover:text-error transition-colors"
                        onclick={() => removeIngredient(index)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         class="h-5 w-5 stroke-current">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    {/each}

    <button
            class="btn btn-outline btn-primary w-full gap-2"
            onclick={addIngredient}
            type="button"
    >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Add ingredient
    </button>
</fieldset>