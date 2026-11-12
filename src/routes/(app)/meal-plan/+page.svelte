<script lang="ts">
    import { getRecipesByUserId } from "$lib/functions/recipe.remote";
    import {
        getMealPlan,
        addToMealPlan,
        removeFromMealPlan,
        getShoppingList,
        setShoppingListItemChecked,
        getCalendarFeed,
        rotateCalendarFeed,
    } from "$lib/functions/meal-plan.remote";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Spinner } from "$lib/components/ui/spinner";
    import * as Dialog from "$lib/components/ui/dialog";
    import { ChevronLeft, ChevronRight, Clock, Plus, Search, ShoppingCart, Trash2, X, CalendarPlus, Copy, Check, RefreshCw } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import type { Recipe } from "$lib/server/db/recipe";
    import { m } from "$lib/paraglide/messages";
    import { getLocale } from "$lib/paraglide/runtime.js";
    import { imageVariantUrl } from "$lib/images";
    import { SHOPPING_CATEGORIES, type ShoppingCategory } from "$lib/shopping-list";

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
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
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
    let adding = $state(false);
    let loadVersion = 0;
    let savingItemIds = $state<number[]>([]);
    let selectedRecipeId = $state<number | null>(null);
    let shoppingList = $state<ShoppingItem[]>([]);
    let calendarDialogOpen = $state(false);
    let calendarUrl = $state("");
    let calendarLoading = $state(false);
    let calendarCopied = $state(false);
    let calendarRotating = $state(false);
    let calendarError = $state<string | null>(null);

    const monday = $derived(getMonday(new Date(Date.now() + weekOffset * 7 * 86400000)));

    const weekDays = $derived(getWeekDays(monday));
    const today = $derived(formatDate(new Date()));

    const filteredRecipes = $derived(
        recipes.filter((r) =>
            r.title.toLowerCase().includes(recipeSearch.toLowerCase())
        )
    );

    const shoppingGroups = $derived.by(() => {
        const labels: Record<ShoppingCategory, string> = {
            produce: m["mealPlan.category.produce"](),
            meat_fish: m["mealPlan.category.meatFish"](),
            dairy_eggs: m["mealPlan.category.dairyEggs"](),
            bakery: m["mealPlan.category.bakery"](),
            pantry: m["mealPlan.category.pantry"](),
            frozen: m["mealPlan.category.frozen"](),
            drinks: m["mealPlan.category.drinks"](),
            other: m["mealPlan.category.other"](),
        };

        return SHOPPING_CATEGORIES
            .map((category) => ({
                category,
                label: labels[category],
                items: shoppingList.filter((item) => item.category === category),
            }))
            .filter((group) => group.items.length > 0);
    });

    function formatQuantity(quantity: number): string {
        if (Number.isInteger(quantity)) return String(quantity);
        return String(Number(quantity.toFixed(2)));
    }

    function entriesForDate(date: string): MealPlanEntry[] {
        return mealPlanEntries.filter((e) => e.date === date);
    }

    async function loadData() {
        if (!userId) return;
        const version = ++loadVersion;
        shoppingList = [];
        loading = true;
        error = null;
        try {
            const start = weekDays[0].date;
            const end = weekDays[6].date;
            const [plan, userRecipes, list] = await Promise.all([
                getMealPlan({ startDate: start, endDate: end }).run(),
                getRecipesByUserId({ userId }).run(),
                getShoppingList({ startDate: start, endDate: end }).run(),
            ]);
            if (version !== loadVersion) return;
            mealPlanEntries = plan;
            recipes = userRecipes;
            shoppingList = list;
        } catch (e: any) {
            if (version === loadVersion) error = m["mealPlan.error.load"]();
        } finally {
            if (version === loadVersion) loading = false;
        }
    }

    $effect(() => {
        weekDays;
        userId;
        queueMicrotask(loadData);
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
        if (adding) return;
        const alreadyPlanned = entriesForDate(date).some(
            (entry) => entry.recipeId === id
        );
        if (alreadyPlanned) {
            selectedRecipeId = null;
            return;
        }

        adding = true;
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
            error = m["mealPlan.error.add"]();
        } finally {
            adding = false;
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

    async function toggleChecked(item: ShoppingItem) {
        if (savingItemIds.includes(item.id)) return;
        savingItemIds = [...savingItemIds, item.id];
        const next = !item.checked;
        shoppingList = shoppingList.map((entry) =>
            entry.id === item.id ? { ...entry, checked: next } : entry
        );

        try {
            await setShoppingListItemChecked({ itemId: item.id, checked: next });
        } catch {
            shoppingList = shoppingList.map((entry) =>
                entry.id === item.id ? { ...entry, checked: !next } : entry
            );
            error = m["mealPlan.error.checkItem"]();
        } finally {
            savingItemIds = savingItemIds.filter((id) => id !== item.id);
        }
    }

    async function openCalendarDialog() {
        calendarDialogOpen = true;
        if (calendarUrl || calendarLoading) return;

        calendarLoading = true;
        calendarError = null;
        try {
            const result = await getCalendarFeed().run();
            calendarUrl = result.url;
        } catch {
            calendarError = m["mealPlan.calendar.error"]();
        } finally {
            calendarLoading = false;
        }
    }

    async function copyCalendarUrl() {
        if (!calendarUrl) return;
        try {
            await navigator.clipboard.writeText(calendarUrl);
            calendarCopied = true;
            toast.success(m["mealPlan.calendar.copied"]());
            setTimeout(() => (calendarCopied = false), 2000);
        } catch {
            calendarError = m["mealPlan.calendar.copyError"]();
        }
    }

    async function rotateCalendar() {
        if (calendarRotating) return;

        calendarRotating = true;
        calendarError = null;
        try {
            const result = await rotateCalendarFeed();
            calendarUrl = result.url;
            calendarCopied = false;
            toast.success(m["mealPlan.calendar.rotated"]());
        } catch {
            calendarError = m["mealPlan.calendar.error"]();
        } finally {
            calendarRotating = false;
        }
    }
</script>

<div class="mt-2 flex flex-col gap-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
            <h1 class="page-title">{m["mealPlan.title"]()}</h1>
            <p class="text-sm text-muted-foreground">
                {new Date(monday).toLocaleDateString(getLocale(), { month: "long", day: "numeric" })}
                {" – "}
                {new Date(monday.getTime() + 6 * 86400000).toLocaleDateString(getLocale(), { month: "long", day: "numeric", year: "numeric" })}
            </p>
        </div>
    </div>

    {#if error}
        <div role="alert" class="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button aria-label={m["actions.cancel"]()} class="flex size-11 shrink-0 items-center justify-center rounded transition hover:bg-destructive/10" onclick={() => (error = null)}><X class="size-4"/></button>
        </div>
    {/if}

    <div class="flex items-center justify-between gap-2">
        <div class="inline-flex items-center rounded-lg border border-border/70 bg-card p-0.5">
            <Button aria-label={m["mealPlan.previousWeek"]()} class="size-9 rounded-md" size="icon" variant="ghost" onclick={prevWeek}>
                <ChevronLeft class="size-4"/>
            </Button>
            <Button class="h-9 px-3 text-xs font-medium" size="sm" variant="ghost" onclick={goToCurrentWeek}>
                {m["mealPlan.today"]()}
            </Button>
            <Button aria-label={m["mealPlan.nextWeek"]()} class="size-9 rounded-md" size="icon" variant="ghost" onclick={nextWeek}>
                <ChevronRight class="size-4"/>
            </Button>
        </div>
        <div class="flex items-center gap-2">
            <Button aria-expanded={sidebarOpen} aria-label={sidebarOpen ? m["mealPlan.closeRecipes"]() : m["mealPlan.addRecipes"]()} class="h-9" size="sm" variant={sidebarOpen ? "secondary" : "outline"} onclick={() => { sidebarOpen = !sidebarOpen; shoppingListOpen = false; }}>
                <Search class="size-4 sm:mr-1.5"/>
                <span class="hidden sm:inline">{sidebarOpen ? m["mealPlan.closeRecipes"]() : m["mealPlan.addRecipes"]()}</span>
            </Button>
            <Button aria-expanded={shoppingListOpen} aria-label={m["mealPlan.shoppingList"]()} class="h-9" size="sm" variant={shoppingListOpen ? "default" : "outline"} onclick={() => { shoppingListOpen = !shoppingListOpen; sidebarOpen = false; }}>
                <ShoppingCart class="size-4 sm:mr-1.5"/>
                <span class="hidden sm:inline">{m["mealPlan.shoppingList"]()}</span>
            </Button>
            <Button aria-label={m["mealPlan.calendar.button"]()} class="h-9" size="sm" variant="outline" onclick={openCalendarDialog}>
                <CalendarPlus class="size-4 sm:mr-1.5"/>
                <span class="hidden sm:inline">{m["mealPlan.calendar.button"]()}</span>
            </Button>
        </div>
    </div>

    {#if selectedRecipeId != null}
        <div role="status" class="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-2 text-sm">
            <p>{m["mealPlan.chooseDay"]({title: recipes.find(recipe => recipe.id === selectedRecipeId)?.title ?? ''})}</p>
            <Button variant="ghost" size="icon" aria-label={m["actions.cancel"]()} onclick={() => selectedRecipeId = null}><X class="size-4"/></Button>
        </div>
    {/if}

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
                            aria-label={m["mealPlan.searchPlaceholder"]()}
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
                                    aria-pressed={selectedRecipeId === recipe.id}
                                    onclick={() => {
                                        selectedRecipeId = selectedRecipeId === recipe.id ? null : recipe.id;
                                        sidebarOpen = false;
                                    }}
                                    ondragstart={(e) => handleDragStart(e, recipe.id)}
                                >
                                    <img
                                        src={imageVariantUrl(recipe.image, "thumb")}
                                        alt={recipe.title}
                                        class="h-10 w-10 rounded-md object-cover shrink-0"
                                        decoding="async"
                                        loading="lazy"
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

            <div class="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {#each weekDays as { name, date }}
                    {@const dayEntries = entriesForDate(date)}
                    {@const isToday = date === today}
                    <div
                        role="region"
                        aria-label="{name} meal plan"
                        class="flex min-h-[120px] flex-col rounded-xl border transition-colors sm:min-h-[300px] {isToday ? 'border-primary/40 bg-primary/5' : 'border-border/70 bg-card/30'} {dayEntries.length > 0 ? 'bg-primary/5' : ''} {selectedRecipeId != null ? 'border-primary/50 ring-1 ring-primary/30' : ''}"
                        ondragover={(e) => e.preventDefault()}
                        ondrop={(e) => handleDrop(e, date)}
                    >
                        <div class="border-b border-border/60 px-3 py-2 sm:py-2.5">
                            <div class="flex items-baseline justify-between gap-2">
                                <p class="text-[11px] font-semibold uppercase tracking-wide {isToday ? 'text-primary' : 'text-muted-foreground'}">{name.slice(0, 3)}</p>
                                <p class="text-sm font-semibold tabular-nums {isToday ? 'text-primary' : ''}">
                                    {new Date(date + "T00:00:00").getDate()}
                                </p>
                            </div>
                            {#if selectedRecipeId != null}
                                <button
                                    disabled={adding}
                                    class="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-primary/15 text-sm font-medium text-primary transition hover:bg-primary/25"
                                    onclick={() => addRecipeToDate(selectedRecipeId!, date)}
                                >
                                    <Plus class="size-3"/>
                                    {m["mealPlan.addHere"]()}
                                </button>
                            {/if}
                        </div>

                        <div class="flex-1 space-y-2 overflow-y-auto p-1.5 sm:p-2">
                            {#if dayEntries.length === 0}
                                <div class="flex h-full min-h-16 items-center justify-center px-2 text-center text-sm text-muted-foreground">
                                    <span class="sm:hidden">{m["mealPlan.tapToPlan"]()}</span><span class="hidden sm:inline">{m["mealPlan.dropHere"]()}</span>
                                </div>
                            {:else}
                                {#each dayEntries as entry (entry.id)}
                                    <div class="group flex items-start gap-1 rounded-lg border border-border/60 bg-card p-1.5 transition-colors hover:border-border sm:gap-2 sm:p-2">
                                        <a class="flex min-w-0 flex-1 items-start gap-2" href={`/recipe/${entry.recipe.id}`}>
                                            <img
                                                src={imageVariantUrl(entry.recipe.image, "thumb")}
                                                alt={entry.recipe.title}
                                                class="size-9 shrink-0 rounded-md object-cover sm:size-10"
                                                decoding="async"
                                                loading="lazy"
                                            />
                                            <div class="min-w-0 flex-1">
                                                <p class="line-clamp-2 text-xs font-medium leading-snug sm:text-[13px]">{entry.recipe.title}</p>
                                                <p class="truncate text-[11px] text-muted-foreground">
                                                    {entry.recipe.cookingTime} min
                                                </p>
                                            </div>
                                        </a>
                                        <button
                                            aria-label={m["actions.delete"]()}
                                            class="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                            onclick={() => handleRemove(entry.id)}
                                        >
                                            <Trash2 class="size-3.5"/>
                                        </button>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            {#if shoppingListOpen}
                <div class="order-first flex w-full shrink-0 flex-col gap-3 rounded-xl border bg-card/50 p-4 lg:order-none lg:w-72">
                    <div class="flex items-center justify-between">
                        <h2 class="font-semibold text-sm">{m["mealPlan.shoppingList"]()}</h2>                        <button aria-label={m["mealPlan.shoppingList"]()} class="flex size-11 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground" onclick={() => (shoppingListOpen = false)}>
                            <X class="size-4"/>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto space-y-2 max-h-[60vh]">
                        {#if shoppingList.length === 0}
                            <p class="text-sm text-muted-foreground text-center py-8">{m["mealPlan.emptyShoppingList"]()}</p>
                        {:else}
                            {#each shoppingGroups as group (group.category)}
                                <div class="space-y-1.5">
                                    <h3 class="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                                    {#each group.items as item (item.id)}
                                        <button
                                            role="checkbox"
                                            aria-checked={item.checked}
                                            disabled={savingItemIds.includes(item.id)}
                                            class="flex min-h-11 w-full items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left {item.checked ? 'opacity-60' : ''}"
                                            onclick={() => toggleChecked(item)}
                                        >
                                            <div class="min-w-0 flex-1">
                                                <p class="text-sm font-medium truncate {item.checked ? 'line-through' : ''}">{item.name}</p>
                                                <p class="text-xs text-muted-foreground">{formatQuantity(item.quantity)} {item.unit}</p>
                                            </div>
                                            <div class="shrink-0 ml-2">
                                                {#if item.checked}
                                                    <span class="text-green-500 text-xs font-bold">✓</span>
                                                {:else}
                                                    <span class="text-muted-foreground/30 text-xs">○</span>
                                                {/if}
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <Dialog.Root bind:open={calendarDialogOpen}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>{m["mealPlan.calendar.title"]()}</Dialog.Title>
                <Dialog.Description>{m["mealPlan.calendar.description"]()}</Dialog.Description>
            </Dialog.Header>

            {#if calendarError}
                <p role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{calendarError}</p>
            {/if}

            {#if calendarLoading}
                <div class="flex items-center justify-center py-10">
                    <Spinner/>
                </div>
            {:else if calendarUrl}
                <div class="flex gap-2">
                    <Input aria-label={m["mealPlan.calendar.linkLabel"]()} class="font-mono text-xs" readonly value={calendarUrl}/>
                    <Button aria-label={m["mealPlan.calendar.copy"]()} class="h-10 shrink-0" onclick={copyCalendarUrl} size="icon" variant="outline">
                        {#if calendarCopied}
                            <Check class="size-4"/>
                        {:else}
                            <Copy class="size-4"/>
                        {/if}
                    </Button>
                </div>

                <div class="space-y-2 text-sm text-muted-foreground">
                    <p class="font-medium text-foreground">{m["mealPlan.calendar.howToTitle"]()}</p>
                    <ol class="list-decimal space-y-1 pl-5">
                        <li>{m["mealPlan.calendar.step1"]()}</li>
                        <li>{m["mealPlan.calendar.step2"]()}</li>
                        <li>{m["mealPlan.calendar.step3"]()}</li>
                    </ol>
                    <p>{m["mealPlan.calendar.security"]()}</p>
                </div>

                <Dialog.Footer class="items-center justify-between sm:justify-between">
                    <Button class="text-muted-foreground" disabled={calendarRotating} onclick={rotateCalendar} size="sm" variant="ghost">
                        <RefreshCw class="size-4 {calendarRotating ? 'animate-spin' : ''}"/>
                        {m["mealPlan.calendar.rotate"]()}
                    </Button>
                    <Dialog.Close class={buttonVariants({ size: "sm", variant: "outline" })}>
                        {m["actions.close"]()}
                    </Dialog.Close>
                </Dialog.Footer>
            {/if}
        </Dialog.Content>
    </Dialog.Root>
</div>
