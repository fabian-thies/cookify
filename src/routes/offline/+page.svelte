<script lang="ts">
    import {page} from '$app/state';
    import {ChefHat, WifiOff} from 'lucide-svelte';
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

    let recipes = $state<OfflineRecipe[]>([]);
    let offline = $state(false);
    const recipe = $derived(recipes.find(({id}) => id === Number(page.url.searchParams.get('recipe'))));
    const cooking = $derived(page.url.searchParams.get('cook') === '1');

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
        <CookMode {recipe} exitCookMode={() => location.assign(`/offline?recipe=${recipe.id}`)}/>
    {/key}
{:else if recipe}
    <main class="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <Button href="/offline" variant="ghost">
            <WifiOff class="size-4"/>
            {m['offline.savedRecipes']()}
        </Button>
        <div class="space-y-3">
            <h1 class="page-title">{recipe.title}</h1>
            <p class="whitespace-pre-line text-muted-foreground">{recipe.description}</p>
            <Button href={`/offline?recipe=${recipe.id}&cook=1`}>
                <ChefHat class="size-4"/>
                {m['recipe.cookMode.title']()}
            </Button>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
            <Ingredients ingredients={recipe.ingredients} servings={recipe.servings}/>
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
            {#if recipes.length === 0}<p class="text-muted-foreground">{m['offline.text']()}</p>{/if}
        </div>
        {#if recipes.length > 0}
            <ul aria-label={m['offline.savedRecipes']()} class="w-full max-w-md divide-y divide-border rounded-xl border bg-card px-3">
                {#each recipes as item (item.id)}
                    <li class="flex items-center justify-between gap-2 py-2 text-left">
                        <a class="px-2 py-2 font-medium hover:underline" href={`/offline?recipe=${item.id}`}>{item.title}</a>
                        <Button size="sm" variant="ghost" onclick={() => removeCopy(item.id)}>{m['offline.removeRecipe']()}</Button>
                    </li>
                {/each}
            </ul>
        {/if}
        <Button data-sveltekit-reload href="/">{m['offline.retry']()}</Button>
    </div>
{/if}
