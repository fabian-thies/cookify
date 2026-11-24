<script lang="ts">
    import {
        getFavoriteRecipes,
        getRecipes,
        getRecipesByUserId,
        searchRecipes,
    } from "$lib/functions/recipe.remote";
    import {
        getMealPlan,
        addToMealPlan,
        updateMealPlanServings,
        removeFromMealPlan,
        getCalendarFeed,
        rotateCalendarFeed,
    } from "$lib/functions/meal-plan.remote";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Spinner } from "$lib/components/ui/spinner";
    import * as Dialog from "$lib/components/ui/dialog";
    import { ChevronLeft, ChevronRight, Clock, Heart, Loader2, Plus, Search, ShoppingCart, Trash2, X, CalendarPlus, Copy, Check, RefreshCw, Pencil, UtensilsCrossed } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import type { Recipe } from "$lib/server/db/recipe";
    import { m } from "$lib/paraglide/messages";
    import { getLocale } from "$lib/paraglide/runtime.js";
    import { imageVariantUrl } from "$lib/images";
    import ShoppingList from "$lib/components/meal-plan/ShoppingList.svelte";
    import { MAX_SERVINGS, parseServings, servingsQuery } from "$lib/servings";

    type MealPlanEntry = Awaited<ReturnType<typeof getMealPlan>>[number];
    type RecipeScope = "all" | "mine" | "favorites";

    let { data } = $props();
    const userId = $derived(data.userId ?? '');

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
    let ownRecipes = $state<Recipe[]>([]);
    let favoriteRecipes = $state<Recipe[]>([]);
    let publicRecipes = $state<Recipe[]>([]);
    let remoteSearchRecipes = $state<Recipe[] | null>(null);
    let searchingRecipes = $state(false);
    let recipeScope = $state<RecipeScope>("all");
    let recipeSearch = $state("");
    let loading = $state(true);
    let error = $state<string | null>(null);
    let sidebarOpen = $state(false);
    let shoppingListOpen = $state(false);
    let adding = $state(false);
    let servingsDialogOpen = $state(false);
    let servingsInput = $state<number>();
    let servingsError = $state<string | null>(null);
    let plannedMeal = $state<{recipeId: number; title: string; date: string; entryId?: number}>();
    let loadVersion = 0;
    let recipesLoadVersion = 0;
    let shoppingRevision = $state(0);
    let selectedRecipeId = $state<number | null>(null);
    let calendarDialogOpen = $state(false);
    let calendarUrl = $state("");
    let calendarLoading = $state(false);
    let calendarCopied = $state(false);
    let calendarRotating = $state(false);
    let calendarError = $state<string | null>(null);

    const monday = $derived(getMonday(new Date(Date.now() + weekOffset * 7 * 86400000)));

    const weekDays = $derived(getWeekDays(monday));
    const today = $derived(formatDate(new Date()));

    function mergeRecipes(...lists: Recipe[][]): Recipe[] {
        const seen = new Set<number>();
        const merged: Recipe[] = [];
        for (const list of lists) {
            for (const recipe of list) {
                if (!seen.has(recipe.id)) {
                    seen.add(recipe.id);
                    merged.push(recipe);
                }
            }
        }
        return merged;
    }

    const favoriteIds = $derived(new Set(favoriteRecipes.map((r) => r.id)));
    const allRecipes = $derived(mergeRecipes(favoriteRecipes, ownRecipes, publicRecipes));
    const recipes = $derived(mergeRecipes(allRecipes, remoteSearchRecipes ?? []));

    $effect(() => {
        const term = recipeSearch.trim();
        if (recipeScope !== "all" || !term) {
            remoteSearchRecipes = null;
            searchingRecipes = false;
            return;
        }

        let cancelled = false;
        searchingRecipes = true;
        const timer = setTimeout(async () => {
            try {
                const results = await searchRecipes({ query: term.slice(0, 100) }).run();
                if (!cancelled) {
                    remoteSearchRecipes = results as Recipe[];
                }
            } catch {
                if (!cancelled) {
                    remoteSearchRecipes = null;
                }
            } finally {
                if (!cancelled) {
                    searchingRecipes = false;
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    });

    const filteredRecipes = $derived.by(() => {
        const term = recipeSearch.trim().toLowerCase();
        const matchesTerm = (recipe: Recipe) =>
            !term ||
            recipe.title.toLowerCase().includes(term) ||
            (recipe.tags ?? []).some((tag) => tag.toLowerCase().includes(term));

        if (recipeScope === "mine") {
            return ownRecipes.filter(matchesTerm);
        }
        if (recipeScope === "favorites") {
            return favoriteRecipes.filter(matchesTerm);
        }
        if (!term) {
            return allRecipes;
        }
        return mergeRecipes(allRecipes.filter(matchesTerm), remoteSearchRecipes ?? []);
    });

    function entriesForDate(date: string): MealPlanEntry[] {
        return mealPlanEntries.filter((e) => e.date === date);
    }

    async function loadPlan() {
        if (!userId) return;
        const version = ++loadVersion;
        loading = true;
        error = null;
        try {
            const start = weekDays[0].date;
            const end = weekDays[6].date;
            const plan = await getMealPlan({ startDate: start, endDate: end }).run();
            if (version !== loadVersion) return;
            mealPlanEntries = plan;
        } catch (e: any) {
            if (version === loadVersion) error = m["mealPlan.error.load"]();
        } finally {
            if (version === loadVersion) loading = false;
        }
    }

    async function loadRecipes() {
        if (!userId) return;
        const version = ++recipesLoadVersion;
        try {
            const [userRecipes, favorites, visibleRecipes] = await Promise.all([
                getRecipesByUserId({ userId }).run(),
                getFavoriteRecipes().run(),
                getRecipes({ limit: 100, orderBy: "recent" }).run(),
            ]);
            if (version !== recipesLoadVersion) return;
            ownRecipes = userRecipes;
            favoriteRecipes = favorites as Recipe[];
            publicRecipes = visibleRecipes;
        } catch {
            if (version === recipesLoadVersion) error = m["mealPlan.error.load"]();
        }
    }

    $effect(() => {
        weekDays;
        userId;
        queueMicrotask(loadPlan);
    });

    $effect(() => {
        userId;
        queueMicrotask(loadRecipes);
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

    function handleDrop(e: DragEvent, date: string) {
        e.preventDefault();
        const recipeId = e.dataTransfer?.getData("text/plain");
        if (!recipeId) return;

        const id = parseInt(recipeId, 10);
        if (isNaN(id)) return;

        planRecipe(id, date);
    }

    function planRecipe(id: number, date: string) {
        const entry = entriesForDate(date).find((entry) => entry.recipeId === id);
        const recipe = entry?.recipe ?? recipes.find((recipe) => recipe.id === id);
        if (!recipe || adding) return;

        plannedMeal = {recipeId: id, title: recipe.title, date, entryId: entry?.id};
        servingsInput = parseServings(entry?.servings ?? recipe.servings) ?? 1;
        servingsError = null;
        servingsDialogOpen = true;
    }

    async function savePlannedMeal(event: SubmitEvent) {
        event.preventDefault();
        const servings = parseServings(servingsInput);
        if (!plannedMeal || !servings || adding) return;

        adding = true;
        servingsError = null;
        const {recipeId, date, entryId} = plannedMeal;
        try {
            if (entryId) {
                await updateMealPlanServings({ mealPlanId: entryId, servings });
            } else {
                await addToMealPlan({ recipeId, date, servings });
            }
            selectedRecipeId = null;
            servingsDialogOpen = false;
            shoppingRevision++;
            await loadPlan();
        } catch {
            servingsError = m["mealPlan.error.add"]();
        } finally {
            adding = false;
        }
    }

    async function handleRemove(entryId: number) {
        try {
            await removeFromMealPlan({ mealPlanId: entryId });
            mealPlanEntries = mealPlanEntries.filter((e) => e.id !== entryId);
            shoppingRevision++;
        } catch (e: any) {
            error = e.message ?? m["mealPlan.error.remove"]();
        }
    }

    function handleDragStart(e: DragEvent, recipeId: number) {
        e.dataTransfer?.setData("text/plain", String(recipeId));
        e.dataTransfer!.effectAllowed = "copy";
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

{#snippet thumbnail(image: string, size: string)}
    {#if image}
        <img src={imageVariantUrl(image, "thumb")} alt="" class="{size} shrink-0 rounded-md object-cover"
             decoding="async" loading="lazy"/>
    {:else}
        <span class="{size} grid shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <UtensilsCrossed class="size-4" aria-hidden="true"/>
        </span>
    {/if}
{/snippet}

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

    <div class="flex flex-wrap items-center justify-between gap-2">
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
                            class="pl-9 {searchingRecipes ? 'pr-9' : ''}"
                            placeholder={m["mealPlan.searchPlaceholder"]()}
                            bind:value={recipeSearch}
                        />
                        {#if searchingRecipes}
                            <Loader2 class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"/>
                        {/if}
                    </div>
                    <div class="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background/60 p-1" role="group" aria-label={m["recipe.list.filter"]()}>
                        <button
                            type="button"
                            aria-pressed={recipeScope === "all"}
                            class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors {recipeScope === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
                            onclick={() => recipeScope = "all"}
                        >
                            {m["mealPlan.filter.all"]()}
                        </button>
                        <button
                            type="button"
                            aria-pressed={recipeScope === "mine"}
                            class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors {recipeScope === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
                            onclick={() => recipeScope = "mine"}
                        >
                            {m["mealPlan.filter.mine"]()}
                        </button>
                        <button
                            type="button"
                            aria-pressed={recipeScope === "favorites"}
                            class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors {recipeScope === 'favorites' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
                            onclick={() => recipeScope = "favorites"}
                        >
                            {m["mealPlan.filter.favorites"]()}
                        </button>
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
                                    {@render thumbnail(recipe.image, "size-10")}
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-medium truncate">{recipe.title}</p>
                                        <p class="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock class="h-3 w-3"/>{recipe.cookingTime} min
                                        </p>
                                    </div>
                                    {#if favoriteIds.has(recipe.id)}
                                        <Heart class="size-3.5 shrink-0 text-primary" fill="currentColor" aria-hidden="true"/>
                                    {/if}
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
                                    type="button"
                                    disabled={adding}
                                    class="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-primary/15 text-sm font-medium text-primary transition hover:bg-primary/25"
                                    onclick={() => planRecipe(selectedRecipeId!, date)}
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
                                    <div class="group flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card p-2 transition-colors hover:border-border">
                                        <a class="flex min-w-0 items-start gap-2" href={`/recipe/${entry.recipe.id}${servingsQuery(entry.servings ?? undefined)}`}>
                                            {@render thumbnail(entry.recipe.image, "size-9 sm:size-10")}
                                            <div class="min-w-0 flex-1">
                                                <p class="line-clamp-2 text-xs font-medium leading-snug sm:text-[13px]">{entry.recipe.title}</p>
                                                <p class="truncate text-[11px] text-muted-foreground">
                                                    {m["recipe.common.servingsCount"]({count: entry.servings ?? entry.recipe.servings})}
                                                </p>
                                            </div>
                                        </a>
                                        <div class="flex items-center justify-end gap-0.5 border-t border-border/40 pt-1">
                                            <button
                                                type="button"
                                                aria-label={m["mealPlan.planServings"]()}
                                                class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                                                onclick={() => planRecipe(entry.recipeId, entry.date)}
                                            >
                                                <Pencil class="size-3.5"/>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={m["actions.delete"]()}
                                                class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                                onclick={() => handleRemove(entry.id)}
                                            >
                                                <Trash2 class="size-3.5"/>
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            {#if shoppingListOpen}
                <ShoppingList
                    weekStart={weekDays[0].date}
                    planRevision={shoppingRevision}
                    onClose={() => shoppingListOpen = false}
                />
            {/if}
        </div>
    {/if}

    <Dialog.Root bind:open={servingsDialogOpen} onOpenChange={(open) => { if (!open) servingsError = null; }}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>{m["mealPlan.planServings"]()}</Dialog.Title>
                <Dialog.Description>{plannedMeal?.title}</Dialog.Description>
            </Dialog.Header>
            <form class="space-y-4" onsubmit={savePlannedMeal}>
                <div class="grid gap-2">
                    <Label for="planned-servings">{m["recipe.form.details.servingsLabel"]()}</Label>
                    <Input id="planned-servings" aria-label={m["mealPlan.planServings"]()} type="number" bind:value={servingsInput}
                           required min={1} max={MAX_SERVINGS} step={1}/>
                </div>
                {#if servingsError}
                    <p role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{servingsError}</p>
                {/if}
                <Dialog.Footer>
                    <Dialog.Close class={buttonVariants({variant: "outline"})}>{m["actions.cancel"]()}</Dialog.Close>
                    <Button type="submit" disabled={adding}>
                        {#if adding}<Spinner/>{:else}{m["actions.save"]()}{/if}
                    </Button>
                </Dialog.Footer>
            </form>
        </Dialog.Content>
    </Dialog.Root>

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
