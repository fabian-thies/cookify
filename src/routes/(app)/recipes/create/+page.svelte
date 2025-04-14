<script lang="ts">
    import type {IngredientInput} from "$lib/types";

    let preparationSteps = $state("");
    let recipeName = $state("");
    let servings = $state(1);
    let cookingTime = $state("");
    let visibility = $state("Draft") as "Draft" | "Published";
    let imageFile: File | null = $state(null);
    let imagePreview: string | null = $state(null);

    let ingredients: IngredientInput[] = $state([
        {
            name: "",
            quantity: ""
        }
    ]);

    function addIngredient() {
        ingredients = [...ingredients, {name: "", quantity: ""}];
    }

    function removeIngredient(index: number) {
        if (ingredients.length <= 1) {
            return;
        }

        ingredients = ingredients.filter((_, i) => i !== index);
    }

    function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            imageFile = input.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                imagePreview = e.target?.result as string;
            };

            reader.readAsDataURL(input.files[0]);
        }
    }
</script>

<article class="container mx-auto p-6">
    <div class="bg-base-100 rounded-xl p-8">
        <form class="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <section class="space-y-3 lg:col-span-1">
                <header>
                    <h2 class="text-md font-semibold text-base-content/80">RECIPE INFORMATION</h2>
                </header>
                <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                    <legend class="sr-only">Recipe Information</legend>
                    <div>
                        <div
                                id="dropzone"
                                class="border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 p-8 rounded-lg text-center cursor-pointer transition-all duration-300 relative group h-48 flex flex-col items-center justify-center"
                        >
                            {#if imagePreview}
                                <img src={imagePreview} alt="Recipe preview" class="absolute inset-0 w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p class="text-white text-sm">Klicken, um Bild zu ändern</p>
                                </div>
                            {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                     stroke="currentColor"
                                     class="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors duration-300">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                                </svg>
                                <p class="mt-2 text-sm text-base-content/70 group-hover:text-base-content">Drag image here
                                    or click to select</p>
                            {/if}
                            <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                   onchange={handleImageUpload} accept="image/*"/>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <fieldset class="space-y-2">
                            <legend class="sr-only">Recipe Name</legend>
                            <label for="recipe-name" class="text-sm font-medium text-base-content/70">Recipe
                                name</label>
                            <input
                                    id="recipe-name"
                                    name="recipe-name"
                                    required
                                    class="input input-bordered w-full rounded-lg border-base-300 bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="Give your recipe a name"
                                    bind:value={recipeName}
                            />
                        </fieldset>

                        <div class="grid grid-cols-2 gap-4">
                            <fieldset class="space-y-2">
                                <legend class="sr-only">Servings</legend>
                                <label for="servings" class="text-sm font-medium text-base-content/70">Servings</label>
                                <input
                                        id="servings"
                                        name="servings"
                                        type="number"
                                        required
                                        class="input input-bordered w-full rounded-lg border-base-300 bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Number of servings"
                                        bind:value={servings}
                                />
                            </fieldset>

                            <fieldset class="space-y-2">
                                <legend class="sr-only">Cooking time</legend>
                                <label for="duration"
                                       class="text-sm font-medium text-base-content/70">Cooking time</label>
                                <input
                                        id="duration"
                                        name="duration"
                                        type="time"
                                        required
                                        class="input input-bordered w-full rounded-lg border-base-300 bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Duration"
                                        bind:value={cookingTime}
                                />
                            </fieldset>
                        </div>

                        <fieldset class="space-y-2">
                            <legend class="sr-only">Visibility</legend>
                            <label for="visibility"
                                   class="text-sm font-medium text-base-content/70">Visibility</label>
                            <select
                                    id="visibility"
                                    class="select select-bordered w-full rounded-lg border-base-300 bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    bind:value={visibility}
                            >
                                <option value="Draft">Draft</option>
                                <option value="Published">Published</option>
                            </select>
                        </fieldset>
                    </div>
                </fieldset>
            </section>
            <section class="space-y-3 lg:col-span-3">
                <header>
                    <h2 class="text-md font-semibold text-base-content/80">INGREDIENTS & INSTRUCTIONS</h2>
                </header>

                <div class="space-y-12">
                    <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                        <legend class="sr-only">Ingredients</legend>
                        <label for="ingredients" class="text-md font-medium text-base-content/70">Ingredients</label>

                        {#each ingredients as ingredient, index}
                            <div class="space-y-3 mt-3">
                                <div class="flex items-center gap-2">
                                    <input id="ingredients-amount" type="text"
                                           class="input input-bordered w-1/3 rounded-lg border-base-300 bg-base-100"
                                           placeholder="Amount (e.g. 200g)"
                                           bind:value={ingredient.quantity}/>
                                    <input id="ingredients-name" type="text"
                                           class="input input-bordered flex-grow rounded-lg border-base-300 bg-base-100"
                                           placeholder="Ingredient (e.g. apple)"
                                           bind:value={ingredient.name}/>
                                    <button type="button" aria-label="Remove ingredient"
                                            class="btn btn-circle btn-sm btn-ghost text-base-content/50 hover:bg-error/10 hover:text-error transition-colors"
                                            onclick={() => removeIngredient(index)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                             class="h-5 w-5 stroke-current">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {/each}

                        <button type="button" class="btn btn-outline btn-primary w-full gap-2" onclick={addIngredient}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                 stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                            </svg>
                            Add ingredient
                        </button>
                    </fieldset>

                    <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                        <legend class="sr-only">Preparation Steps</legend>
                        <label for="instructions"
                               class="text-md font-medium text-base-content/70">Preparation steps</label>
                        <div class="mt-3">
                            <textarea
                                    id="instructions"
                                    class="textarea textarea-bordered w-full h-40 resize-y rounded-lg border-base-300 bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="Describe how to prepare your recipe..."
                                    bind:value={preparationSteps}
                            ></textarea>
                        </div>
                    </fieldset>
                </div>
            </section>
        </form>

        <footer class="mt-12 flex justify-end gap-4">
            <button class="btn btn-ghost" type="button">Cancel</button>
            <button class="btn btn-primary" type="submit" onclick={submitForm}>Save recipe</button>
        </footer>
    </div>
</article>