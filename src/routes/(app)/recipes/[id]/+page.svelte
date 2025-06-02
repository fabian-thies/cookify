<script lang="ts">
    import {UPLOAD_DIR} from "$lib/client/config";
    import type {Ingredient, Recipe} from "$lib/server/db/schema";
    import Icon from "@iconify/svelte";

    let {data} = $props();

    const recipe: Recipe = data.recipe;
    const ingredients: Ingredient[] = data.ingredients;

    const rating = 4.8;
    const reviewCount = 124;
    const difficulty = "Einfach";
    const category = "Hauptgericht";

    const recipeSteps = [
        {
            step: 1,
            title: "Vorbereitung",
            description:
                "Hähnchenbrust in mundgerechte Stücke schneiden und mit Salz und Pfeffer würzen. Zwiebel und Knoblauch fein hacken.",
        },
        {
            step: 2,
            title: "Hähnchen anbraten",
            description:
                "Olivenöl in einer großen Pfanne erhitzen. Hähnchenstücke von allen Seiten goldbraun anbraten (ca. 5-6 Minuten).",
        },
        {
            step: 3,
            title: "Gemüse hinzufügen",
            description: "Zwiebel und Knoblauch zu dem Hähnchen geben und 2-3 Minuten glasig dünsten.",
        },
        {
            step: 4,
            title: "Pasta kochen",
            description:
                "Parallel in einem großen Topf Salzwasser zum Kochen bringen und die Pasta nach Packungsanweisung al dente kochen.",
        },
        {
            step: 5,
            title: "Sauce zubereiten",
            description:
                "Sahne zu dem Hähnchen gießen und aufkochen lassen. Mit Salz, Pfeffer und italienischen Kräutern würzen.",
        },
        {
            step: 6,
            title: "Finalisieren",
            description:
                "Spinat unterrühren und kurz zusammenfallen lassen. Gekochte Pasta untermischen und mit Parmesan servieren.",
        },
    ];
</script>

<div class="min-h-screen bg-base-200">
    <div class="container mx-auto px-4 py-8">
        <div class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <span class="badge badge-primary bg-primary/20 text-primary">
                    {category}
                </span>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm border-base-content/30">
                        <Icon icon="mdi:heart" class="h-4 w-4 mr-2"/>
                        Favorit
                    </button>
                    <button class="btn btn-outline btn-sm border-base-content/30">
                        <Icon icon="mdi:share" class="h-4 w-4 mr-2"/>
                        Teilen
                    </button>
                    <button class="btn btn-outline btn-sm border-base-content/30">
                        <Icon icon="mdi:printer" class="h-4 w-4 mr-2"/>
                        Drucken
                    </button>
                </div>
            </div>

            <h1 class="text-4xl font-bold text-base-content mb-4">{recipe.title}</h1>

            <div class="flex items-center gap-4 text-base-content/60 mb-6">
                <div class="flex items-center gap-1">
                    <div class="rating flex">
                        <input type="radio" name="rating-2" class="mask mask-star-2 bg-primary" checked={rating >= 1} aria-label="1 star"/>
                        <input type="radio" name="rating-2" class="mask mask-star-2 bg-primary" checked={rating >= 2} aria-label="2 star"/>
                        <input type="radio" name="rating-2" class="mask mask-star-2 bg-primary" checked={rating >= 3} aria-label="3 star"/>
                        <input type="radio" name="rating-2" class="mask mask-star-2 bg-primary" checked={rating >= 4} aria-label="4 star"/>
                        <input type="radio" name="rating-2" class="mask mask-star-2 bg-primary" checked={rating >= 5} aria-label="5 star"/>
                    </div>
                    <span class="ml-1">{rating} ({reviewCount} Bewertungen)</span>
                </div>
            </div>
        </div>

        <div class="grid lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="relative rounded-box overflow-hidden shadow-2xl">
                    <img
                            src={UPLOAD_DIR + recipe.imageUrl}
                            alt={recipe.title}
                            class="w-full h-64 sm:h-80 lg:h-96 object-cover"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-base-content/20 to-transparent"/>
                </div>

                <div class="grid sm:grid-cols-3 gap-4">
                    <div class="card bg-base-100 shadow-md">
                        <div class="card-body flex items-center justify-center p-6">
                            <div class="text-center">
                                <Icon icon="mdi:clock-outline" class="h-8 w-8 text-primary mx-auto mb-2"/>
                                <p class="text-sm text-base-content/60">Zubereitungszeit</p>
                                <p class="text-xl font-semibold">{recipe.prepTime || 30} Min</p>
                            </div>
                        </div>
                    </div>

                    <div class="card bg-base-100 shadow-md">
                        <div class="card-body flex items-center justify-center p-6">
                            <div class="text-center">
                                <Icon icon="mdi:account-group" class="h-8 w-8 text-primary mx-auto mb-2"/>
                                <p class="text-sm text-base-content/60">Portionen</p>
                                <p class="text-xl font-semibold">{recipe.servings || 4}</p>
                            </div>
                        </div>
                    </div>

                    <div class="card bg-base-100 shadow-md">
                        <div class="card-body flex items-center justify-center p-6">
                            <div class="text-center">
                                <Icon icon="mdi:chef-hat" class="h-8 w-8 text-primary mx-auto mb-2"/>
                                <p class="text-sm text-base-content/60">Schwierigkeit</p>
                                <p class="text-xl font-semibold">{difficulty}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Beschreibung</h2>
                        <p class="text-base-content/70 leading-relaxed">
                            {recipe.description}
                        </p>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Zubereitung</h2>
                        <div class="space-y-6">
                            {#each recipeSteps as step}
                                <div class="flex gap-4">
                                    <div class="flex-shrink-0 w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center font-semibold text-sm">
                                        {step.step}
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-base-content mb-1">{step.title}</h3>
                                        <p class="text-base-content/70">{step.description}</p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="card bg-base-100 shadow-md sticky top-4">
                    <div class="card-body">
                        <h2 class="card-title">Zutaten</h2>
                        <div class="space-y-3">
                            {#each ingredients as ingredient}
                                <div class="flex items-center gap-3">
                                    <input type="checkbox" class="checkbox checkbox-primary"/>
                                    <span class="text-base-content/70">{ingredient.quantity} {ingredient.name}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Nährwerte (pro Portion)</h2>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Kalorien</span>
                                <span class="font-semibold">520 kcal</span>
                            </div>
                            <div class="divider my-1"></div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Protein</span>
                                <span class="font-semibold">35g</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Kohlenhydrate</span>
                                <span class="font-semibold">45g</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Fett</span>
                                <span class="font-semibold">18g</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Ballaststoffe</span>
                                <span class="font-semibold">3g</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-md">
                    <div class="card-body">
                        <h2 class="card-title">Tipps</h2>
                        <div class="space-y-3 text-sm text-base-content/70">
                            <div class="flex items-start gap-2">
                                <div class="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"/>
                                <p>Für extra Geschmack können Sie etwas Weißwein zur Sauce hinzufügen.</p>
                            </div>
                            <div class="flex items-start gap-2">
                                <div class="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"/>
                                <p>Das Pasta-Wasser nicht vergessen - es hilft, die Sauce zu binden.</p>
                            </div>
                            <div class="flex items-start gap-2">
                                <div class="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"/>
                                <p>Frischer Spinat kann durch TK-Spinat ersetzt werden (gut abtropfen lassen).</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
