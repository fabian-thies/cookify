<script lang="ts">
    import { getRecipesByUserId } from "$lib/functions/recipe.remote";
    import {
        getMealPlan,
        addToMealPlan,
        removeFromMealPlan,
    } from "$lib/functions/meal-plan.remote";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Spinner } from "$lib/components/ui/spinner";
    import { ChevronLeft, ChevronRight, Clock, Search, Trash2, X } from "lucide-svelte";
    import type { Recipe } from "$lib/server/db/recipe";
    import { m } from "$lib/paraglide/messages";

    type MealPlanEntry = Awaited<ReturnType<typeof getMealPlan>>[number];

    let { data } = $props();
    let userId: string;
    $effect(() => {
        userId = data.userId ?? '';
    });

    const dayNames = $derived([
        m["mealPlan.day.monday"](),
        m["mealPlan.day.tuesday"](),
        m["mealPlan.day.wednesday"](),
        m["mealPlan.day.thursday"](),
        m["mealPlan.day.friday"](),
        m["mealPlan.day.saturday"](),
        m["mealPlan.day.sunday"](),
    ]);

    function getMonday(d: Date): Date {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatDate(d: Date): string {
        return d.toISOString().slice(0, 10);
    }

    function getWeekDays(monday: Date): { name: string; date: string }[] {
        return dayNames.map((n, i) => {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            return { name: n, date: formatDate(day) };
        });
    }

    let weekOffset = $state(0);
    let mealPlanEntries = $state<MealPlanEntry[]>([]);
    let recipes = $state<Recipe[]>([]);
    let recipeSearch = $state("");
    let loading = $state(true);
    let error = $state<string | null>(null);
    let sidebarOpen = $state(true);

    const monday = $derived(getMonday(new Date(Date.now() + weekOffset * 7 * 86400000)));

    const weekDays = $derived(getWeekDays(monday));

    const filteredRecipes = $derived(
        recipes.filter((r) =>
            r.title.toLowerCase().includes(recipeSearch.toLowerCase())
        )
    );

    function entriesForDate(date: string): MealPlanEntry[] {
        return mealPlanEntries.filter((e) => e.date === date);
    }

    async function loadData() {
        if (!userId) return;
        loading = true;
        error = null;
        try {
            const start = weekDays[0].date;
            const end = weekDays[6].date;
            const [plan, userRecipes] = await Promise.all([
                getMealPlan({ startDate: start, endDate: end }),
                getRecipesByUserId({ userId }),
            ]);
            mealPlanEntries = plan;
            recipes = userRecipes;
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.load"]();
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        weekDays;
        userId;
        loadData();
    });

    function prevWeek() {
        weekOffset--;
    }

    function nextWeek() {
        weekOffset++;
    }

    function goToCurrentWeek() {
        weekOffset = 0;
    }

    async function handleDrop(e: DragEvent, date: string) {
        e.preventDefault();
        const recipeId = e.dataTransfer?.getData("text/plain");
        if (!recipeId) return;

        const id = parseInt(recipeId, 10);
        if (isNaN(id)) return;

        const alreadyPlanned = entriesForDate(date).some(
            (entry) => entry.recipeId === id
        );
        if (alreadyPlanned) return;

        try {
            const result = await addToMealPlan({ recipeId: id, date });
            const recipe = recipes.find((r) => r.id === id);
            if (recipe) {
                mealPlanEntries = [
                    ...mealPlanEntries,
                    {
                        id: result.id,
                        userId: "",
                        recipeId: id,
                        date,
                        createdAt: new Date(),
                        recipe: {
                            ...recipe,
                            difficulty: recipe.difficulty ?? "easy",
                            tags: recipe.tags ?? [],
                        },
                    },
                ];
            }
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.add"]();
        }
    }

    async function handleRemove(entryId: number) {
        try {
            await removeFromMealPlan({ mealPlanId: entryId });
            mealPlanEntries = mealPlanEntries.filter((e) => e.id !== entryId);
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.remove"]();
        }
    }

    function handleDragStart(e: DragEvent, recipeId: number) {
        e.dataTransfer?.setData("text/plain", String(recipeId));
        e.dataTransfer!.effectAllowed = "copy";
    }
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6 mt-4">
    <div class="space-y-1">
        <h1 class="font-bold text-4xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {m["mealPlan.title"]()}
        </h1>
        <div class="h-1 w-20 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
    </div>

    {#if error}
        <div class="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button class="hover:opacity-70" onclick={() => (error = null)}><X class="h-4 w-4"/></button>
        </div>
    {/if}

    <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            <Button variant="outline" size="icon" onclick={prevWeek}>
                <ChevronLeft class="h-4 w-4"/>
            </Button>
            <Button variant="outline" size="sm" onclick={goToCurrentWeek}>{m["mealPlan.today"]()}</Button>
            <Button variant="outline" size="icon" onclick={nextWeek}>
                <ChevronRight class="h-4 w-4"/>
            </Button>
        </div>
        <span class="text-sm text-muted-foreground font-medium">
            {new Date(monday).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            {" "}–{" "}
            {new Date(monday.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <Button variant="outline" size="sm" onclick={() => (sidebarOpen = !sidebarOpen)}>
            <Search class="h-4 w-4 mr-2"/>
            {sidebarOpen ? m["mealPlan.closeRecipes"]() : m["mealPlan.addRecipes"]()}
        </Button>
    </div>

    {#if loading}
        <div class="flex items-center justify-center py-20">
            <Spinner/>
        </div>
    {:else}
        <div class="flex gap-4">
            {#if sidebarOpen}
                <div class="w-72 shrink-0 flex flex-col gap-3 p-4 rounded-xl border bg-card/50">
                    <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            class="pl-9"
                            placeholder={m["mealPlan.searchPlaceholder"]()}
                            bind:value={recipeSearch}
                        />
                    </div>
                    <div class="flex-1 overflow-y-auto space-y-2 max-h-[60vh]">
                        {#if filteredRecipes.length === 0}
                            <p class="text-sm text-muted-foreground text-center py-8">{m["mealPlan.noRecipes"]()}</p>
                        {:else}
                            {#each filteredRecipes as recipe (recipe.id)}
                                <button
                                    class="flex w-full items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors text-left"
                                    draggable="true"
                                    ondragstart={(e) => handleDragStart(e, recipe.id)}
                                >
                                    <img
                                        src={recipe.image}
                                        alt={recipe.title}
                                        class="h-10 w-10 rounded-md object-cover shrink-0"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-medium truncate">{recipe.title}</p>
                                        <p class="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock class="h-3 w-3"/>{recipe.cookingTime} min
                                        </p>
                                    </div>
                                </button>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="flex-1 grid grid-cols-7 gap-2">
                {#each weekDays as { name, date }}
                    {@const dayEntries = entriesForDate(date)}
                    <div
                        role="region"
                        aria-label="{name} meal plan"
                        class="flex flex-col rounded-xl border bg-card/30 min-h-[300px] transition-colors {dayEntries.length > 0 ? 'bg-primary/5' : ''}"
                        ondragover={(e) => e.preventDefault()}
                        ondrop={(e) => handleDrop(e, date)}
                    >
                        <div class="px-2 py-2 text-center border-b">
                            <p class="text-xs font-semibold text-muted-foreground uppercase">{name.slice(0, 3)}</p>
                            <p class="text-sm font-medium">
                                {new Date(date + "T00:00:00").getDate()}
                            </p>
                        </div>

                        <div class="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                            {#if dayEntries.length === 0}
                                <div class="flex items-center justify-center h-full text-xs text-muted-foreground/50 italic">
                                    {m["mealPlan.dropHere"]()}
                                </div>
                            {:else}
                                {#each dayEntries as entry (entry.id)}
                                    <div class="flex items-start gap-2 p-2 rounded-lg bg-card border group hover:shadow-sm transition-shadow">
                                        <img
                                            src={entry.recipe.image}
                                            alt={entry.recipe.title}
                                            class="h-8 w-8 rounded object-cover shrink-0"
                                        />
                                        <div class="min-w-0 flex-1">
                                            <p class="text-xs font-medium truncate">{entry.recipe.title}</p>
                                            <p class="text-[10px] text-muted-foreground">
                                                {entry.recipe.cookingTime} min · {entry.recipe.servings} servings
                                            </p>
                                        </div>
                                        <button
                                            class="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                                            onclick={() => handleRemove(entry.id)}
                                        >
                                            <Trash2 class="h-3.5 w-3.5"/>
                                        </button>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>