<script lang="ts">
    import {m} from "$lib/paraglide/messages";
    import {page} from "$app/stores";
    import {getRecipeDetails} from "$lib/functions/recipe.remote";
    import {Button} from "$lib/components/ui/button/index.js";
    import {
        ChefHat,
        ChevronLeft,
        ChevronRight,
        Clock,
        ListChecks,
        Pause,
        Play,
        RotateCcw,
        Timer,
        X
    } from "lucide-svelte";
    import {goto} from "$app/navigation";
    import {onMount} from "svelte";

    const {data} = $props();

    let recipe = $state<any>(null);
    let currentStep = $state(0);
    let showIngredients = $state(false);
    let customMinutes = $state(5);

    interface TimerData {
        id: number;
        remainingSeconds: number;
        totalSeconds: number;
        isRunning: boolean;
        label: string;
    }

    let timers = $state<TimerData[]>([]);
    let timerIdCounter = $state(0);

    let intervalIds = new Map<number, ReturnType<typeof setInterval>>();

    let steps = $derived(recipe?.steps ?? []);
    let totalSteps = $derived(steps.length);
    let ingredients = $derived(recipe?.ingredients ?? []);
    let isFinished = $derived(currentStep >= totalSteps);

    let wakeLock: WakeLockSentinel | null = null;

    $effect(() => {
        const recipeId = Number($page.params.recipeId);
        getRecipeDetails({recipeId, incrementView: false}).then((result) => {
            recipe = result;
        }).catch((error) => {
            console.error('Failed to load recipe:', error);
        });
    });

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (e) {
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }
    }

    onMount(() => {
        requestWakeLock();
        return () => {
            releaseWakeLock();
            intervalIds.forEach(id => clearInterval(id));
        };
    });

    function nextStep() {
        if (currentStep < totalSteps - 1) {
            currentStep++;
        } else {
            currentStep = totalSteps;
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
        }
    }

    function goToStep(index: number) {
        currentStep = index;
    }

    function exitCookMode() {
        goto(`/recipe/${$page.params.recipeId}`);
    }

    function startTimer(minutes: number, label?: string) {
        const id = timerIdCounter++;
        const totalSeconds = minutes * 60;

        const intervalId = setInterval(() => {
            const timer = timers.find(t => t.id === id);
            if (!timer) {
                clearInterval(intervalId);
                intervalIds.delete(id);
                return;
            }

            const newRemaining = timer.remainingSeconds - 1;
            if (newRemaining <= 0) {
                clearInterval(intervalId);
                intervalIds.delete(id);
                timers = timers.map(t =>
                    t.id === id ? { ...t, remainingSeconds: 0, isRunning: false } : t
                );
            } else {
                timers = timers.map(t =>
                    t.id === id ? { ...t, remainingSeconds: newRemaining } : t
                );
            }
        }, 1000);

        intervalIds.set(id, intervalId);

        timers = [...timers, {
            id,
            remainingSeconds: totalSeconds,
            totalSeconds,
            isRunning: true,
            label: label || `${minutes} min`
        }];
    }

    function toggleTimer(timerId: number) {
        const timer = timers.find(t => t.id === timerId);
        if (!timer) return;

        if (timer.isRunning) {
            const intervalId = intervalIds.get(timerId);
            if (intervalId) {
                clearInterval(intervalId);
                intervalIds.delete(timerId);
            }
            timers = timers.map(t =>
                t.id === timerId ? { ...t, isRunning: false } : t
            );
        } else {
            if (timer.remainingSeconds <= 0) return;

            const intervalId = setInterval(() => {
                const current = timers.find(t => t.id === timerId);
                if (!current) {
                    clearInterval(intervalId);
                    intervalIds.delete(timerId);
                    return;
                }

                const newRemaining = current.remainingSeconds - 1;
                if (newRemaining <= 0) {
                    clearInterval(intervalId);
                    intervalIds.delete(timerId);
                    timers = timers.map(t =>
                        t.id === timerId ? { ...t, remainingSeconds: 0, isRunning: false } : t
                    );
                } else {
                    timers = timers.map(t =>
                        t.id === timerId ? { ...t, remainingSeconds: newRemaining } : t
                    );
                }
            }, 1000);

            intervalIds.set(timerId, intervalId);
            timers = timers.map(t =>
                t.id === timerId ? { ...t, isRunning: true } : t
            );
        }
    }

    function resetTimer(timerId: number) {
        const intervalId = intervalIds.get(timerId);
        if (intervalId) {
            clearInterval(intervalId);
            intervalIds.delete(timerId);
        }
        timers = timers.filter(t => t.id !== timerId);
    }

    function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    function extractTimeFromStep(stepText: string): number | null {
        const match = stepText.match(/(\d+)\s*(min|minute|minuten|min\.)\b/i);
        if (match) {
            return parseInt(match[1]);
        }
        return null;
    }
</script>

{#if recipe}
    <div class="fixed inset-0 z-50 bg-background flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
            <div class="flex items-center gap-3">
                <ChefHat class="w-6 h-6 text-primary"/>
                <h1 class="text-lg font-bold truncate max-w-[50vw]">{recipe.title}</h1>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" onclick={() => showIngredients = !showIngredients}>
                    <ListChecks class="w-4 h-4 mr-1.5"/>
                    <span class="hidden sm:inline">{m["recipe.cookMode.ingredients"]()}</span>
                </Button>
                <Button variant="outline" size="sm" onclick={exitCookMode}>
                    <X class="w-4 h-4 mr-1.5"/>
                    <span class="hidden sm:inline">{m["recipe.cookMode.exit"]()}</span>
                </Button>
            </div>
        </div>
        <div class="w-full h-1 bg-muted">
            <div
                class="h-full bg-primary transition-all duration-500 ease-out"
                style="width: {totalSteps > 0 ? ((isFinished ? totalSteps : currentStep + 1) / totalSteps) * 100 : 0}%"
            ></div>
        </div>
        <div class="flex-1 flex overflow-hidden relative">
            {#if showIngredients}
                <div class="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border z-10 overflow-y-auto p-4 shadow-xl transition-transform">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold">{m["recipe.cookMode.ingredients"]()}</h2>
                        <Button variant="ghost" size="icon" onclick={() => showIngredients = false}>
                            <X class="w-4 h-4"/>
                        </Button>
                    </div>
                    <p class="text-sm text-muted-foreground mb-4">{m["recipe.common.forServings"]({count: recipe.servings})}</p>
                    <ul class="space-y-3">
                        {#each ingredients as ing}
                            <li class="flex items-start gap-3">
                                <span class="font-semibold text-primary min-w-[60px] text-base">
                                    {ing.quantity} {ing.unit}
                                </span>
                                <span class="text-base">{ing.name}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
            <div class="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6">
                {#if isFinished}
                    <div class="text-center animate-fade-in">
                        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <ChefHat class="w-10 h-10 text-primary"/>
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-bold mb-3">{m["recipe.cookMode.finish"]()}</h2>
                        <p class="text-muted-foreground text-lg mb-8">{recipe.title}</p>
                        <Button size="lg" onclick={() => currentStep = 0}>
                            <RotateCcw class="w-4 h-4 mr-2"/>
                            {m["recipe.cookMode.resetTimer"]()}
                        </Button>
                    </div>
                {:else if totalSteps > 0}
                    <div class="w-full max-w-2xl animate-fade-in">
                        <div class="text-center mb-6">
                            <span class="text-sm font-medium text-muted-foreground">
                                {m["recipe.cookMode.step"]({current: currentStep + 1, total: totalSteps})}
                            </span>
                        </div>
                        <div class="flex items-start gap-4 sm:gap-6 mb-8">
                            <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl sm:text-2xl font-bold">
                                {currentStep + 1}
                            </div>
                            <p class="text-xl sm:text-2xl md:text-3xl leading-relaxed font-medium pt-2 sm:pt-3">
                                {steps[currentStep].step}
                            </p>
                        </div>
                        {#if extractTimeFromStep(steps[currentStep].step)}
                            {@const stepMinutes = extractTimeFromStep(steps[currentStep].step)!}
                            <div class="flex justify-center mb-4">
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onclick={() => startTimer(stepMinutes, `Schritt ${currentStep + 1}`)}
                                >
                                    <Timer class="w-5 h-5 mr-2"/>
                                    {stepMinutes} min Timer starten
                                </Button>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="text-center text-muted-foreground">
                        {m["recipe.cookMode.noSteps"]()}
                    </div>
                {/if}
                {#if totalSteps > 1 && !isFinished}
                    <div class="flex gap-2 mt-4 flex-wrap justify-center">
                        {#each steps as _, i}
                            <button
                                class="w-3 h-3 rounded-full transition-all {i === currentStep ? 'bg-primary scale-125' : i < currentStep ? 'bg-primary/40' : 'bg-muted-foreground/30'}"
                                onclick={() => goToStep(i)}
                                aria-label="{m["recipe.cookMode.step"]({current: i + 1, total: totalSteps})}"
                            ></button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
        {#if timers.length > 0}
            <div class="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-2">
                <div class="flex flex-wrap gap-3 justify-center">
                    {#each timers as timer (timer.id)}
                        <div class="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                            <Clock class="w-4 h-4 text-primary"/>
                            <span class="text-sm font-medium">{timer.label}</span>
                            <span class="font-mono text-lg font-bold {timer.remainingSeconds === 0 ? 'text-destructive' : ''}">
                                {formatTime(timer.remainingSeconds)}
                            </span>
                            <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => toggleTimer(timer.id)}>
                                {#if timer.isRunning}
                                    <Pause class="w-3.5 h-3.5"/>
                                {:else}
                                    <Play class="w-3.5 h-3.5"/>
                                {/if}
                            </Button>
                            <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => resetTimer(timer.id)}>
                                <X class="w-3.5 h-3.5"/>
                            </Button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        <div class="border-t border-border bg-card px-4 py-4 sm:px-8">
            <div class="max-w-2xl mx-auto">
                <div class="flex items-center justify-center gap-2 mb-4">
                    <Timer class="w-4 h-4 text-muted-foreground"/>
                    <span class="text-sm text-muted-foreground">{m["recipe.cookMode.timer"]()}:</span>
                    {#each [1, 3, 5, 10, 15] as mins}
                        <Button
                            variant="secondary"
                            size="sm"
                            onclick={() => startTimer(mins)}
                        >
                            {mins} min
                        </Button>
                    {/each}
                </div>
                <div class="flex items-center justify-center gap-2 mb-4">
                    <input
                        type="number"
                        bind:value={customMinutes}
                        min="1"
                        max="999"
                        class="w-16 h-8 text-center bg-secondary rounded-md border border-border text-sm"
                    />
                    <span class="text-sm text-muted-foreground">{m["recipe.cookMode.setMinutes"]()}</span>
                    <Button variant="outline" size="sm" onclick={() => {
                        if (customMinutes > 0) startTimer(customMinutes);
                    }}>
                        <Play class="w-3.5 h-3.5 mr-1"/>
                        {m["recipe.cookMode.startTimer"]()}
                    </Button>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        onclick={prevStep}
                        disabled={currentStep === 0}
                        class="flex-1 max-w-[200px]"
                    >
                        <ChevronLeft class="w-5 h-5 mr-1"/>
                        {m["recipe.cookMode.previous"]()}
                    </Button>

                    <Button
                        variant={isFinished ? "secondary" : "default"}
                        size="lg"
                        onclick={nextStep}
                        disabled={isFinished}
                        class="flex-1 max-w-[200px]"
                    >
                        {m["recipe.cookMode.next"]()}
                        <ChevronRight class="w-5 h-5 ml-1"/>
                    </Button>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
            <ChefHat class="w-10 h-10 text-primary animate-pulse"/>
            <p class="text-muted-foreground">{m.loading()}</p>
        </div>
    </div>
{/if}
