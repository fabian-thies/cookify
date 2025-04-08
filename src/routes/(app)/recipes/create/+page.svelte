<article class="container mx-auto p-6">
    <div class="bg-base-100 rounded-xl p-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <section class="space-y-3 lg:col-span-1">
                <h2 class="text-md font-semibold text-base-content/80">RECIPE INFORMATION</h2>
                <div class="bg-base-200 p-6 rounded-md space-y-4">
                    <div>
                        <div
                                id="dropzone"
                                class="border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 p-8 rounded-lg text-center cursor-pointer transition-all duration-300 relative group h-48 flex flex-col items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                 stroke="currentColor"
                                 class="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors duration-300">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                            </svg>
                            <p class="mt-2 text-sm text-base-content/70 group-hover:text-base-content">Drag image here
                                or click to select</p>
                            <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <fieldset class="space-y-2">
                            <label for="recipe-name" class="text-sm font-medium text-base-content/70">Recipe
                                name</label>
                            <input
                                    id="recipe-name"
                                    name="recipe-name"
                                    required
                                    class="input input-bordered w-full rounded-lg border-base-300 bg-base-200/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="Give your recipe a name"
                            />
                        </fieldset>

                        <div class="grid grid-cols-2 gap-4">
                            <fieldset class="space-y-2">
                                <label for="servings" class="text-sm font-medium text-base-content/70">Servings</label>
                                <input
                                        id="servings"
                                        name="servings"
                                        type="number"
                                        required
                                        class="input input-bordered w-full rounded-lg border-base-300 bg-base-200/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Number of servings"
                                />
                            </fieldset>

                            <fieldset class="space-y-2">
                                <label for="duration"
                                       class="text-sm font-medium text-base-content/70">Preparation time</label>
                                <input
                                        id="duration"
                                        name="duration"
                                        type="time"
                                        required
                                        class="input input-bordered w-full rounded-lg border-base-300 bg-base-200/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Duration"
                                />
                            </fieldset>
                        </div>

                        <fieldset class="space-y-2">
                            <label for="visibility"
                                   class="text-sm font-medium text-base-content/70">Visibility</label>
                            <select
                                    id="visibility"
                                    class="select select-bordered w-full rounded-lg border-base-300 bg-base-200/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            >
                                <option>Draft</option>
                                <option>Published</option>
                            </select>
                        </fieldset>
                    </div>
                </div>
            </section>
            <section class="space-y-3 lg:col-span-3">
                <h2 class="text-md font-semibold text-base-content/80">INGREDIENTS & INSTRUCTIONS</h2>

                <div class="space-y-12">
                    <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                        <label class="text-md font-medium text-base-content/70">Ingredients</label>

                        <div class="space-y-3 mt-3">
                            <div class="flex items-center gap-2">
                                <input type="text"
                                       class="input input-bordered w-1/3 rounded-lg border-base-300 bg-base-200/50"
                                       placeholder="Amount (e.g. 200g)"/>
                                <input type="text"
                                       class="input input-bordered flex-grow rounded-lg border-base-300 bg-base-200/50"
                                       placeholder="Ingredient (e.g. apple)"/>
                                <button aria-label="Remove ingredient"
                                        class="btn btn-circle btn-sm btn-ghost text-base-content/50 hover:bg-error/10 hover:text-error transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                         class="h-5 w-5 stroke-current">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button class="btn btn-outline btn-primary w-full gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                 stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                            </svg>
                            Add ingredient
                        </button>
                    </fieldset>

                    <fieldset class="bg-base-200 p-6 rounded-md space-y-4">
                        <label for="instructions"
                               class="text-md font-medium text-base-content/70">Preparation steps</label>
                        <div class="mt-3">
                            <textarea
                                    id="instructions"
                                    class="textarea textarea-bordered w-full h-40 resize-y rounded-lg border-base-300 bg-base-200/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="Describe how to prepare your recipe..."
                            ></textarea>
                        </div>
                    </fieldset>
                </div>
            </section>
        </div>

        <div class="mt-12 flex justify-end gap-4">
            <button class="btn btn-ghost">Cancel</button>
            <button class="btn btn-primary">Save recipe</button>
        </div>
    </div>
</article>
