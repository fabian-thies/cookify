<script lang="ts">
    import ErrorState from "$lib/components/ErrorState.svelte";
    import {remainingSeconds} from "$lib/timer";
    import {m} from "$lib/paraglide/messages";
    import {page} from "$app/stores";
    import {getRecipeDetails, recordRecipeCooked} from "$lib/functions/recipe.remote";
    import * as Dialog from "$lib/components/ui/dialog";
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
    import {toast} from "svelte-sonner";

    const {data} = $props();

    let recipe = $state<any>(null);
    let failed = $state(false);
    let currentStep = $state(0);
    let showIngredients = $state(false);
    let customMinutes = $state(5);
    let cookedRecorded = false;

    interface TimerData {
        id: number;
        remainingSeconds: number;
        totalSeconds: number;
        isRunning: boolean;
        label: string;
        deadline: number;
    }

    let timers = $state<TimerData[]>([]);
    let timerIdCounter = $state(0);


    let steps = $derived(recipe?.steps ?? []);
    let totalSteps = $derived(steps.length);
    let ingredients = $derived(recipe?.ingredients ?? []);
    let isFinished = $derived(totalSteps > 0 && currentStep >= totalSteps);

    let wakeLock: WakeLockSentinel | null = null;

    function loadRecipe() {
        failed = false;
        const recipeId = Number($page.params.recipeId);
        getRecipeDetails({recipeId, incrementView: false}).run().then((result) => {
            recipe = result;
        }).catch((error) => {
            console.error('Failed to load recipe:', error);
            failed = true;
        });
    }

    $effect(() => { $page.params.recipeId; queueMicrotask(loadRecipe); });

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator && (!wakeLock || wakeLock.released)) {
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
        const interval = setInterval(updateTimers, 250);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateTimers();
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            releaseWakeLock();
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    });

    async function markCooked() {
        if (cookedRecorded || !recipe) return;
        cookedRecorded = true;

        try {
            await recordRecipeCooked({recipeId: recipe.id});
        } catch (error) {
            console.error('Failed to save cooking history', error);
        }
    }

    function nextStep() {
        if (currentStep < totalSteps - 1) {
            currentStep++;
        } else if (totalSteps > 0) {
            currentStep = totalSteps;
            void markCooked();
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

    function finishTimer(label: string) {
        toast.success(`${m["recipe.cookMode.timerDone"]()} · ${label}`);
        navigator.vibrate?.([200, 100, 200]);
    }

    function updateTimers() {
        const now = Date.now();
        timers = timers.map(timer => {
            if (!timer.isRunning) return timer;
            const seconds = remainingSeconds(timer.deadline, now);
            if (seconds === timer.remainingSeconds) return timer;
            if (seconds === 0) finishTimer(timer.label);
            return {...timer, remainingSeconds: seconds, isRunning: seconds > 0};
        });
    }

    function startTimer(minutes: number, label?: string) {
        if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 999) return;
        const seconds = Math.round(minutes * 60);
        timers = [...timers, {
            id: timerIdCounter++,
            remainingSeconds: seconds,
            totalSeconds: seconds,
            isRunning: true,
            label: label || `${minutes} min`,
            deadline: Date.now() + seconds * 1000
        }];
    }

    function toggleTimer(timerId: number) {
        updateTimers();
        timers = timers.map(timer => {
            if (timer.id !== timerId || timer.remainingSeconds <= 0) return timer;
            return {
                ...timer,
                isRunning: !timer.isRunning,
                deadline: Date.now() + timer.remainingSeconds * 1000
            };
        });
    }

    function resetTimer(timerId: number) {
        timers = timers.filter(timer => timer.id !== timerId);
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

<svelte:head><title>{recipe?.title ? `${recipe.title} · Cookify` : 'Cookify'}</title></svelte:head>

{#if recipe}
    <div class="fixed inset-0 z-50 flex h-dvh flex-col bg-background">
        <div class="flex items-center justify-between gap-2 border-b border-border bg-card/80 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-4 sm:py-3">
            <div class="flex min-w-0 items-center gap-2 sm:gap-3">
                <ChefHat class="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"/>
                <h1 class="truncate text-base font-bold sm:text-lg">{recipe.title}</h1>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
                <Dialog.Root bind:open={showIngredients}>
                    <Dialog.Trigger>
                        {#snippet child({props})}
                            <Button {...props} aria-label={m["recipe.cookMode.ingredients"]()} variant="ghost" size="sm" class="px-2 sm:px-3">
                                <ListChecks class="size-4"/>
                                <span class="hidden sm:inline">{m["recipe.cookMode.ingredients"]()}</span>
                            </Button>
                        {/snippet}
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{m["recipe.cookMode.ingredients"]()}</Dialog.Title>
                            <Dialog.Description>{m["recipe.common.forServings"]({count: recipe.servings})}</Dialog.Description>
                        </Dialog.Header>
                    <ul class="divide-y divide-border/50">
                        {#each ingredients as ing}
                            <li class="flex items-start gap-3 py-2.5">
                                <span class="min-w-16 text-sm font-semibold tabular-nums text-primary">
                                    {ing.quantity} {ing.unit}
                                </span>
                                <span class="text-sm leading-relaxed">{ing.name}</span>
                            </li>
                        {/each}
                    </ul>
                    </Dialog.Content>
                </Dialog.Root>
                <Button aria-label={m["recipe.cookMode.exit"]()} variant="outline" size="sm" class="px-2 sm:px-3" onclick={exitCookMode}>
                    <X class="h-4 w-4 sm:mr-1.5"/>
                    <span class="hidden sm:inline">{m["recipe.cookMode.exit"]()}</span>
                </Button>
            </div>
        </div>
        <div class="h-0.5 w-full bg-border">
            <div
                class="h-full rounded-r-full bg-primary transition-all duration-500 ease-out"
                style="width: {totalSteps > 0 ? ((isFinished ? totalSteps : currentStep + 1) / totalSteps) * 100 : 0}%"
            ></div>
        </div>
        <div class="relative flex flex-1 overflow-hidden">
            <div class="flex flex-1 flex-col items-center overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
                {#if isFinished}
                    <div class="my-auto animate-fade-in text-center">
                        <div class="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
                            <ChefHat class="size-10 text-primary"/>
                        </div>
                        <h2 class="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">{m["recipe.cookMode.finish"]()}</h2>
                        <p class="mb-8 text-muted-foreground">{recipe.title}</p>
                        <div class="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                            <Button size="lg" onclick={() => currentStep = 0}>
                                <RotateCcw class="size-4"/>
                                {m["recipe.cookMode.restart"]()}
                            </Button>
                            <Button size="lg" variant="outline" onclick={exitCookMode}>
                                {m["recipe.cookMode.exit"]()}
                            </Button>
                        </div>
                    </div>
                {:else if totalSteps > 0}
                    <div class="my-auto w-full max-w-2xl animate-fade-in">
                        <div class="mb-6 text-center">
                            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {m["recipe.cookMode.step"]({current: currentStep + 1, total: totalSteps})}
                            </span>
                        </div>
                        <div class="mb-8 flex items-start gap-4 sm:gap-6">
                            <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold tabular-nums text-primary-foreground sm:size-14 sm:text-xl">
                                {currentStep + 1}
                            </div>
                            <p class="pt-1 text-xl font-medium leading-relaxed sm:pt-2.5 sm:text-2xl md:text-3xl">
                                {steps[currentStep].step}
                            </p>
                        </div>
                        {#if extractTimeFromStep(steps[currentStep].step)}
                            {@const stepMinutes = extractTimeFromStep(steps[currentStep].step)!}
                            <div class="mb-4 flex justify-center">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onclick={() => startTimer(stepMinutes, m["recipe.cookMode.stepLabel"]({number: currentStep + 1}))}
                                >
                                    <Timer class="size-4"/>
                                    {m["recipe.cookMode.startStepTimer"]({minutes: stepMinutes})}
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
                    <div class="mt-4 flex flex-wrap justify-center">
                        {#each steps as _, i}
                            <button
                                aria-label={m["recipe.cookMode.step"]({current: i + 1, total: totalSteps})}
                                aria-current={i === currentStep ? "step" : undefined}
                                class="flex size-11 items-center justify-center rounded-full"
                                onclick={() => goToStep(i)}
                            >
                                <span class="block size-1.5 rounded-full transition-all {i === currentStep ? 'scale-150 bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-muted-foreground/40'}"></span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
        {#if timers.length > 0}
            <div class="border-t border-border bg-card/80 px-4 py-2 backdrop-blur-sm">
                <div class="flex flex-wrap justify-center gap-2">
                    {#each timers as timer (timer.id)}
                        <div class="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-2.5 py-1.5">
                            <Clock class="size-3.5 text-primary"/>
                            <span class="text-xs font-medium text-muted-foreground">{timer.label}</span>
                            <span class="font-mono text-base font-semibold tabular-nums {timer.remainingSeconds === 0 ? 'text-destructive' : ''}">
                                {formatTime(timer.remainingSeconds)}
                            </span>
                            <Button aria-label={timer.isRunning ? m["recipe.cookMode.pauseTimer"]() : m["recipe.cookMode.startTimer"]()} class="size-7" size="icon" variant="ghost" onclick={() => toggleTimer(timer.id)}>
                                {#if timer.isRunning}
                                    <Pause class="size-3.5"/>
                                {:else}
                                    <Play class="size-3.5"/>
                                {/if}
                            </Button>
                            <Button aria-label={m["recipe.cookMode.resetTimer"]()} class="size-7" size="icon" variant="ghost" onclick={() => resetTimer(timer.id)}>
                                <X class="size-3.5"/>
                            </Button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        <div class="border-t border-border bg-card px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4">
            <div class="mx-auto max-w-2xl">
                <div class="mb-3 flex items-center gap-2 overflow-x-auto sm:mb-4 sm:justify-center">
                    <Timer class="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"/>
                    <span class="hidden shrink-0 text-sm text-muted-foreground sm:inline">{m["recipe.cookMode.timer"]()}:</span>
                    {#each [1, 3, 5, 10, 15] as mins}
                        <Button
                            class="shrink-0"
                            variant="secondary"
                            size="sm"
                            onclick={() => startTimer(mins)}
                        >
                            {mins} min
                        </Button>
                    {/each}
                </div>
                <div class="mb-3 flex items-center justify-center gap-2 sm:mb-4">
                    <input
                        aria-label={m["recipe.cookMode.setMinutes"]()}
                        type="number"
                        inputmode="numeric"
                        bind:value={customMinutes}
                        min="1"
                        max="999"
                        class="h-11 w-16 rounded-md border border-border bg-secondary text-center text-base sm:text-sm"
                    />
                    <span class="text-sm text-muted-foreground">{m["recipe.cookMode.setMinutes"]()}</span>
                    <Button variant="outline" size="sm" onclick={() => {
                        if (customMinutes > 0) startTimer(customMinutes);
                    }}>
                        <Play class="mr-1 h-3.5 w-3.5"/>
                        {m["recipe.cookMode.startTimer"]()}
                    </Button>
                </div>
                <div class="flex items-center justify-between gap-3 sm:gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        onclick={prevStep}
                        disabled={currentStep === 0}
                        class="h-11 flex-1 max-w-[200px]"
                    >
                        <ChevronLeft class="mr-1 h-5 w-5"/>
                        {m["recipe.cookMode.previous"]()}
                    </Button>

                    <Button
                        variant={isFinished ? "secondary" : "default"}
                        size="lg"
                        onclick={nextStep}
                        disabled={isFinished || totalSteps === 0}
                        class="h-11 flex-1 max-w-[200px]"
                    >
                        {m["recipe.cookMode.next"]()}
                        <ChevronRight class="ml-1 h-5 w-5"/>
                    </Button>
                </div>
            </div>
        </div>
    </div>
{:else if failed}
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-4">
        <ErrorState message={m["actions.loadRecipeError"]()} onRetry={loadRecipe}/>
        <Button variant="outline" onclick={exitCookMode}>{m["recipe.cookMode.exit"]()}</Button>
    </div>
{:else}
    <div class="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
            <ChefHat class="w-10 h-10 text-primary animate-pulse"/>
            <p class="text-muted-foreground">{m.loading()}</p>
        </div>
    </div>
{/if}
