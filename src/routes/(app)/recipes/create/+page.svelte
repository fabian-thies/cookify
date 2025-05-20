<script lang="ts">
    import type {IngredientInput} from "$lib/types";
    import {enhance} from "$app/forms";
    import ImageUploader from "$lib/components/ImageUploader.svelte";
    import IngredientsList from "$lib/components/IngredientsList.svelte";
    import FormField from "$lib/components/FormField.svelte";
    import TextAreaField from "$lib/components/TextAreaField.svelte";
    import SelectField from "$lib/components/SelectField.svelte";

    let {data, form}: PageProps = $props();

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

    $effect(() => {
        if (form?.success) {
            window.location.href = `/`;
        }
    });
</script>

<article class="max-w-[120rem] mx-auto p-6">
    <form class="grid grid-cols-1 lg:grid-cols-4 gap-6" enctype="multipart/form-data" id="create-recipe"
          method="POST" use:enhance>
        <section class="space-y-3">
            <header>
                <h2 class="text-md font-semibold text-base-content/80">RECIPE INFORMATION</h2>
            </header>
            <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                <legend class="sr-only">Recipe Information</legend>
                <div>
                    <ImageUploader
                            bind:imageFile={imageFile}
                            bind:imagePreview={imagePreview}
                            error={form?.errors?.imageFile ? "Please upload an image for your recipe" : undefined}
                    />
                </div>

                <div class="space-y-4">
                    <FormField
                            bind:value={recipeName}
                            error={form?.errors?.recipeName ? "Please enter a recipe name" : undefined}
                            id="recipe-name"
                            label="Recipe name"
                            name="recipe-name"
                            placeholder="Give your recipe a name"
                    />

                    <FormField
                            bind:value={servings}
                            error={form?.errors?.servings ? "Please enter a valid number of servings" : undefined}
                            id="servings"
                            label="Servings"
                            name="servings"
                            placeholder="Number of servings"
                            type="number"
                            unit="servings"
                    />

                    <FormField
                            bind:value={cookingTime}
                            error={form?.errors?.cookingTime ? "Please enter cooking time" : undefined}
                            id="duration"
                            label="Cooking time"
                            min={1}
                            name="duration"
                            placeholder="Minutes"
                            type="number"
                            unit="minutes"
                    />

                    <SelectField
                            bind:value={visibility}
                            id="visibility"
                            label="Visibility"
                            name="visibility"
                            options={[
                                { value: "Draft", label: "Draft" },
                                { value: "Published", label: "Published" }
                            ]}
                    />
                </div>
            </fieldset>
        </section>
        <section class="space-y-3 lg:col-span-3">
            <header>
                <h2 class="text-md font-semibold text-base-content/80">INGREDIENTS & INSTRUCTIONS</h2>
            </header>

            <div class="space-y-12">
                <IngredientsList
                        bind:ingredients={ingredients}
                        error={form?.errors?.ingredients ? "Please add at least one ingredient with name and quantity" : undefined}
                />

                <TextAreaField
                        bind:value={preparationSteps}
                        error={form?.errors?.preparationSteps ? "Please describe how to prepare your recipe" : undefined}
                        id="instructions"
                        label="Preparation steps"
                        name="instructions"
                        placeholder="Describe how to prepare your recipe..."
                />
            </div>
        </section>

        <!--            <footer class="mt-12 flex justify-end gap-4 col-span-full">
                        <button class="btn btn-ghost" type="button">Cancel</button>
                        <button class="btn btn-primary" type="submit">Save recipe</button>
                    </footer>-->
    </form>
</article>
