<script lang="ts">
    import {goto} from '$app/navigation';
    import {page} from '$app/state';
    import {ChefHat, ChevronLeft, Trash2, Users, WifiOff} from 'lucide-svelte';
    import {onMount} from 'svelte';
    import {toast} from 'svelte-sonner';
    import CookMode from '$lib/components/recipe/view/CookMode.svelte';
    import Ingredients from '$lib/components/recipe/view/Ingredients.svelte';
    import Preparation from '$lib/components/recipe/view/Preparation.svelte';
    import Tips from '$lib/components/recipe/view/Tips.svelte';
    import {Button} from '$lib/components/ui/button';
    import {Toaster} from '$lib/components/ui/sonner';
    import {m} from '$lib/paraglide/messages';
    import {listOfflineRecipes, removeOfflineRecipe, type OfflineRecipe} from '$lib/offline-recipes';
    import {parseServings} from '$lib/servings';

    let recipes = $state<OfflineRecipe[]>([]);
    let offline = $state(false);
    const recipe = $derived(recipes.find(({id}) => id === Number(page.url.searchParams.get('recipe'))));
    const cooking = $derived(page.url.searchParams.get('cook') === '1');
    let desiredServings = $state<number>();
    const portionQuery = $derived(desiredServings ? `&servings=${desiredServings}` : '');

    $effect(() => {
        page.url.searchParams.get('recipe');
        desiredServings = parseServings(page.url.searchParams.get('servings'));
    });

    function loadCopies() {
        recipes = listOfflineRecipes();
        offline = !navigator.onLine;
    }

    onMount(() => {
        loadCopies();
        window.addEventListener('storage', loadCopies);
        window.addEventListener('pageshow', loadCopies);
        window.addEventListener('focus', loadCopies);
        window.addEventListener('online', loadCopies);
        window.addEventListener('offline', loadCopies);
        return () => {
            window.removeEventListener('storage', loadCopies);
            window.removeEventListener('pageshow', loadCopies);
            window.removeEventListener('focus', loadCopies);
            window.removeEventListener('online', loadCopies);
            window.removeEventListener('offline', loadCopies);
        };
    });

    function removeCopy(id: number) {
        try {
            removeOfflineRecipe(id);
            loadCopies();
        } catch {
            toast.error(m['offline.removeError']());
        }
    }
</script>

<svelte:head><title>{recipe ? `${recipe.title} · Cookify` : 'Cookify'}</title></svelte:head>
<Toaster offset={84} position="top-center" richColors/>

{#if recipe && cooking}
    {#key recipe.id}
        <CookMode {recipe} servings={desiredServings}
                  exitCookMode={() => void goto(`/offline?recipe=${recipe.id}${portionQuery}`)}/>
    {/key}
{:else if recipe}
    <main class="mx-auto w-full max-w-7xl space-y-6 px-4 pt-5 pb-12 sm:px-6">
        <div class="flex items-center justify-between gap-2">
            <Button href="/offline" size="sm" variant="ghost" class="-ml-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft class="size-4" aria-hidden="true"/>
                {m['offline.savedRecipes']()}
            </Button>
            {#if offline}
                <span class="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-medium text-muted-foreground">
                    <WifiOff class="size-3.5 text-primary" aria-hidden="true"/>
                    {m['offline.title']()}
                </span>
            {/if}
        </div>
        <div class="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-8">
            <h1 class="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:col-start-1">{recipe.title}</h1>
            {#if recipe.description}
                <p class="mt-2 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground sm:text-base lg:col-start-1">
                    {recipe.description}
                </p>
            {/if}
            <div class="mt-4 flex flex-wrap items-center gap-2 lg:col-start-1">
                <span class="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-[13px] font-medium">
                    <Users class="size-3.5 text-primary" aria-hidden="true"/>
                    {m['recipe.common.servingsCount']({count: desiredServings ?? recipe.servings})}
                </span>
            </div>
            <div class="mt-4 flex items-center gap-2 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-start">
                <Button class="flex-1 sm:flex-none" href={`/offline?recipe=${recipe.id}&cook=1${portionQuery}`} size="lg">
                    <ChefHat class="size-4"/>
                    {m['recipe.cookMode.title']()}
                </Button>
            </div>
        </div>
        <div class="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            <div class="lg:col-span-1">
                <Ingredients ingredients={recipe.ingredients} servings={recipe.servings} bind:desiredServings/>
            </div>
            <div class="lg:col-span-2">
                <Preparation steps={recipe.steps}/>
                <Tips tips={recipe.tips}/>
            </div>
        </div>
    </main>
{:else}
    <div class="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <WifiOff class="size-7"/>
        </div>
        <div class="max-w-sm space-y-2">
            <h1 class="page-title">{offline ? m['offline.title']() : m['offline.savedRecipes']()}</h1>
            {#if recipes.length === 0}<p class="text-sm text-muted-foreground">{m['offline.text']()}</p>{/if}
        </div>
        {#if recipes.length > 0}
            <ul aria-label={m['offline.savedRecipes']()} class="w-full max-w-md divide-y divide-border/60 rounded-xl border border-border/70 bg-card p-2">
                {#each recipes as item (item.id)}
                    <li class="flex items-center justify-between gap-2 py-1 text-left first:pt-0 last:pb-0">
                        <a class="flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-accent/50" href={`/offline?recipe=${item.id}`}>
                            <span class="truncate">{item.title}</span>
                        </a>
                        <Button
                            aria-label={m['offline.removeRecipe']()}
                            class="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            size="sm"
                            variant="ghost"
                            onclick={() => removeCopy(item.id)}
                        >
                            <Trash2 class="size-4" aria-hidden="true"/>
                            <span class="hidden sm:inline">{m['offline.removeRecipe']()}</span>
                        </Button>
                    </li>
                {/each}
            </ul>
        {/if}
        <Button data-sveltekit-reload href="/" variant="outline">{m['offline.retry']()}</Button>
    </div>
{/if}
