<script lang="ts">
    import { getRecipesByUserId } from "$lib/functions/recipe.remote";
    import {
        getMealPlan,
        addToMealPlan,
        removeFromMealPlan,
        getShoppingList,
    } from "$lib/functions/meal-plan.remote";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Spinner } from "$lib/components/ui/spinner";
    import { ChevronLeft, ChevronRight, Clock, Plus, Search, ShoppingCart, Trash2, X } from "lucide-svelte";
    import type { Recipe } from "$lib/server/db/recipe";
    import { m } from "$lib/paraglide/messages";
    import { getLocale } from "$lib/paraglide/runtime.js";

    type MealPlanEntry = Awaited<ReturnType<typeof getMealPlan>>[number];
    type ShoppingItem = Awaited<ReturnType<typeof getShoppingList>>[number];

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
    let sidebarOpen = $state(false);
    let shoppingListOpen = $state(false);
    let selectedRecipeId = $state<number | null>(null);
    let shoppingList = $state<ShoppingItem[]>([]);
    let checkedItems = $state<Set<string>>(new Set());

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
        checkedItems = new Set();
        try {
            const start = weekDays[0].date;
            const end = weekDays[6].date;
            const [plan, userRecipes, list] = await Promise.all([
                getMealPlan({ startDate: start, endDate: end }),
                getRecipesByUserId({ userId }),
                getShoppingList({ startDate: start, endDate: end }),
            ]);
            mealPlanEntries = plan;
            recipes = userRecipes;
            shoppingList = list;
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

        await addRecipeToDate(id, date);
    }

    // Drag and drop does not exist on touch screens, so a tap on a recipe followed by a tap on a day adds it.
    async function addRecipeToDate(id: number, date: string) {
        const alreadyPlanned = entriesForDate(date).some(
            (entry) => entry.recipeId === id
        );
        if (alreadyPlanned) {
            selectedRecipeId = null;
            return;
        }

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
            selectedRecipeId = null;
            shoppingList = await getShoppingList({ startDate: weekDays[0].date, endDate: weekDays[6].date }).run();
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.add"]();
        }
    }

    async function handleRemove(entryId: number) {
        try {
            await removeFromMealPlan({ mealPlanId: entryId });
            mealPlanEntries = mealPlanEntries.filter((e) => e.id !== entryId);
            shoppingList = await getShoppingList({ startDate: weekDays[0].date, endDate: weekDays[6].date }).run();
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.remove"]();
        }
    }

    function handleDragStart(e: DragEvent, recipeId: number) {
        e.dataTransfer?.setData("text/plain", String(recipeId));
        e.dataTransfer!.effectAllowed = "copy";
    }

    function toggleChecked(key: string) {
        const next = new Set(checkedItems);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        checkedItems = next;
    }
</script>

<div class="flex flex-col gap-5 mt-2">
    <div class="space-y-1">
        <h1 class="font-bold text-3xl sm:text-4xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
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

    <div class="flex items-center justify-between gap-2 flex-wrap">
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
            {new Date(monday).toLocaleDateString(getLocale(), { month: "long", day: "numeric" })}
            {" "}–{" "}
            {new Date(monday.getTime() + 6 * 86400000).toLocaleDateString(getLocale(), { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <div class="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onclick={() => (sidebarOpen = !sidebarOpen)}>
                <Search class="h-4 w-4 sm:mr-2"/>
                <span class="hidden sm:inline">{sidebarOpen ? m["mealPlan.closeRecipes"]() : m["mealPlan.addRecipes"]()}</span>
            </Button>
            <Button variant={shoppingListOpen ? "default" : "outline"} size="sm" onclick={() => (shoppingListOpen = !shoppingListOpen)}>
                <ShoppingCart class="h-4 w-4 sm:mr-2"/>
                <span class="hidden sm:inline">{m["mealPlan.shoppingList"]()}</span>
            </Button>
        </div>
    </div>

    {#if loading}
        <div class="flex items-center justify-center py-20">
            <Spinner/>
        </div>
    {:else}
        <div class="flex flex-col gap-4 lg:flex-row">
            {#if sidebarOpen}
                <div class="flex w-full shrink-0 flex-col gap-3 rounded-xl border bg-card/50 p-4 lg:w-72">
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
                                    class="flex w-full items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors text-left {selectedRecipeId === recipe.id ? 'ring-2 ring-primary' : ''}"
                                    draggable="true"
                                    onclick={() => selectedRecipeId = selectedRecipeId === recipe.id ? null : recipe.id}
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

            <div class="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {#each weekDays as { name, date }}
                    {@const dayEntries = entriesForDate(date)}
                    <div
                        role="region"
                        aria-label="{name} meal plan"
                        class="flex min-h-[130px] flex-col rounded-xl border bg-card/30 transition-colors sm:min-h-[300px] {dayEntries.length > 0 ? 'bg-primary/5' : ''} {selectedRecipeId != null ? 'border-primary/50 ring-1 ring-primary/30' : ''}"
                        ondragover={(e) => e.preventDefault()}
                        ondrop={(e) => handleDrop(e, date)}
                    >
                        <div class="border-b px-3 py-2 text-center sm:py-3">
                            <p class="text-xs font-semibold text-muted-foreground uppercase sm:text-sm">{name.slice(0, 3)}</p>
                            <p class="text-sm font-semibold sm:text-base">
                                {new Date(date + "T00:00:00").getDate()}
                            </p>
                            {#if selectedRecipeId != null}
                                <button
                                    class="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                                    onclick={() => addRecipeToDate(selectedRecipeId!, date)}
                                >
                                    <Plus class="size-3"/>
                                    {m["mealPlan.addHere"]()}
                                </button>
                            {/if}
                        </div>

                        <div class="flex-1 space-y-2 overflow-y-auto p-1.5 sm:p-2">
                            {#if dayEntries.length === 0}
                                <div class="flex h-full items-center justify-center text-xs text-muted-foreground/50 italic">
                                    {m["mealPlan.dropHere"]()}
                                </div>
                            {:else}
                                {#each dayEntries as entry (entry.id)}
                                    <svelte:element
                                        this={!sidebarOpen ? 'a' : 'div'}
                                        href={!sidebarOpen ? `/recipe/${entry.recipe.id}` : undefined}
                                        class="group flex items-start gap-2 overflow-hidden rounded-lg border bg-card p-2 transition-shadow hover:shadow-sm sm:gap-3 sm:p-3"
                                    >
                                        <img
                                            src={entry.recipe.image}
                                            alt={entry.recipe.title}
                                            class="h-10 w-10 shrink-0 rounded-md object-cover sm:h-12 sm:w-12"
                                        />
                                        <div class="min-w-0 flex-1">
                                            <p class="text-xs font-medium line-clamp-2 sm:text-sm">{entry.recipe.title}</p>
                                            <p class="truncate text-[11px] text-muted-foreground">
                                                {entry.recipe.cookingTime} min
                                            </p>
                                        </div>
                                        {#if sidebarOpen}
                                        <button
                                            class="shrink-0 text-muted-foreground transition-all hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                                            onclick={(e) => { e.stopPropagation(); handleRemove(entry.id); }}
                                        >
                                            <Trash2 class="h-4 w-4"/>
                                        </button>
                                        {/if}
                                    </svelte:element>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            {#if shoppingListOpen}
                <div class="flex w-full shrink-0 flex-col gap-3 rounded-xl border bg-card/50 p-4 lg:w-72">
                    <div class="flex items-center justify-between">
                        <h2 class="font-semibold text-sm">{m["mealPlan.shoppingList"]()}</h2>
                        <button class="hover:opacity-70" onclick={() => (shoppingListOpen = false)}>
                            <X class="h-4 w-4"/>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto space-y-2 max-h-[60vh]">
                        {#if shoppingList.length === 0}
                            <p class="text-sm text-muted-foreground text-center py-8">{m["mealPlan.emptyShoppingList"]()}</p>
                        {:else}
                            {#each shoppingList as item (item.name + item.unit)}
                                {@const key = `${item.name}|||${item.unit}`}
                                {@const isChecked = checkedItems.has(key)}
                                <button
                                    class="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left w-full {isChecked ? 'opacity-60' : ''}"
                                    onclick={() => toggleChecked(key)}
                                >
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-medium truncate">{item.name}</p>
                                        <p class="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                                    </div>
                                    <div class="shrink-0 ml-2">
                                        {#if isChecked}
                                            <span class="text-green-500 text-xs font-bold">✓</span>
                                        {:else}
                                            <span class="text-muted-foreground/30 text-xs">○</span>
                                        {/if}
                                    </div>
                                </button>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>
