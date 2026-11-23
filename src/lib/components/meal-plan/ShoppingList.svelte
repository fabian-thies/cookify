<script lang="ts">
    import {onMount} from 'svelte';
    import {Check, Plus, Trash2, X} from 'lucide-svelte';
    import ErrorState from '$lib/components/ErrorState.svelte';
    import {Button} from '$lib/components/ui/button';
    import {Input} from '$lib/components/ui/input';
    import {Spinner} from '$lib/components/ui/spinner';
    import {
        addShoppingItem,
        getShoppingList,
        removeShoppingItem,
        setShoppingItemStatus,
        shareShoppingList,
        unshareShoppingList,
    } from '$lib/functions/shopping-list.remote';
    import {m} from '$lib/paraglide/messages';
    import {SHOPPING_CATEGORIES, type ShoppingCategory} from '$lib/shopping-list';

    type ShoppingData = Awaited<ReturnType<ReturnType<typeof getShoppingList>['run']>>;
    type Item = ShoppingData['items'][number];

    const {weekStart, planRevision, onClose}: {
        weekStart: string;
        planRevision: number;
        onClose: () => void;
    } = $props();

    let ownerId = $state('');
    let result = $state<{week: string; owner: string; data: ShoppingData}>();
    let actionError = $state<string | null>(null);
    let loadFailed = $state(false);
    let busy = $state(false);
    let itemName = $state('');
    let username = $state('');
    let invalidUsername = $state(false);
    let request = 0;

    const scope = $derived({ownerId: ownerId || undefined, weekStart});
    const data = $derived(result?.week === weekStart && result.owner === ownerId ? result.data : undefined);
    const groups = $derived.by(() => {
        if (!data) return [];
        const labels: Record<ShoppingCategory, string> = {
            produce: m['mealPlan.category.produce'](),
            meat_fish: m['mealPlan.category.meatFish'](),
            dairy_eggs: m['mealPlan.category.dairyEggs'](),
            bakery: m['mealPlan.category.bakery'](),
            pantry: m['mealPlan.category.pantry'](),
            frozen: m['mealPlan.category.frozen'](),
            drinks: m['mealPlan.category.drinks'](),
            other: m['mealPlan.category.other'](),
        };
        return SHOPPING_CATEGORIES.map(category => ({
            label: labels[category],
            items: data.items.filter(item => item.category === category),
        })).filter(group => group.items.length > 0);
    });

    async function refresh() {
        if (busy) return;
        const version = ++request;
        const week = weekStart;
        const owner = ownerId;
        const revision = planRevision;

        try {
            const next = await getShoppingList({ownerId: owner || undefined, weekStart: week}).run();
            if (version !== request || week !== weekStart || owner !== ownerId || revision !== planRevision) return;
            loadFailed = false;
            if (!next.accessible) {
                result = undefined;
                ownerId = '';
                return;
            }
            result = {week, owner, data: next};
        } catch {
            if (version === request && week === weekStart && owner === ownerId && revision === planRevision) {
                loadFailed = true;
            }
        }
    }

    $effect(() => {
        ownerId;
        weekStart;
        planRevision;
        queueMicrotask(refresh);
    });

    onMount(() => {
        function refreshIfVisible() {
            if (document.visibilityState === 'visible') void refresh();
        }
        const interval = window.setInterval(refreshIfVisible, 8_000);
        document.addEventListener('visibilitychange', refreshIfVisible);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    });

    async function change(action: () => Promise<unknown>) {
        if (busy) return;
        busy = true;
        request++;
        actionError = null;
        try {
            await action();
        } catch {
            actionError = m['mealPlan.shopping.changeError']();
        } finally {
            busy = false;
            await refresh();
        }
    }

    function setStatus(item: Item, status: 'open' | 'bought' | 'have') {
        void change(async () => {
            const applied = await setShoppingItemStatus({
                ...scope, itemId: item.id, status,
                quantity: item.quantity, checked: item.checked, alreadyHave: item.alreadyHave,
            });
            if (!applied) throw new Error('Shopping item changed');
        });
    }

    function addItem(event: SubmitEvent) {
        event.preventDefault();
        const name = itemName.trim();
        if (!name) return;
        void change(async () => {
            await addShoppingItem({...scope, name});
            itemName = '';
        });
    }

    function grant(event: SubmitEvent) {
        event.preventDefault();
        const exactUsername = username.trim();
        if (!exactUsername) return;
        void change(async () => {
            invalidUsername = !await shareShoppingList({username: exactUsername});
            if (!invalidUsername) username = '';
        });
    }

    function formatQuantity(quantity: number) {
        return Number(quantity.toFixed(2)).toString();
    }
</script>

<section aria-label={m['mealPlan.shoppingList']()} class="order-first flex w-full shrink-0 flex-col gap-3 rounded-xl border bg-card/50 p-4 lg:order-none lg:w-72">
    <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">{m['mealPlan.shoppingList']()}</h2>
        <Button aria-label={m['mealPlan.shopping.close']()} size="icon" variant="ghost" onclick={onClose}>
            <X class="size-4"/>
        </Button>
    </div>

    {#if result?.data.sharedBy.length}
        <select
            aria-label={m['mealPlan.shopping.listLabel']()}
            class="h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
            bind:value={ownerId}
            disabled={busy}
        >
            <option value="">{m['mealPlan.shopping.ownList']()}</option>
            {#each result.data.sharedBy as owner (owner.id)}
                <option value={owner.id}>{m['mealPlan.shopping.sharedList']({username: owner.username})}</option>
            {/each}
        </select>
    {/if}

    {#if data}
        <form class="flex min-w-0 gap-2" onsubmit={addItem}>
            <Input
                aria-label={m['mealPlan.shopping.itemName']()}
                placeholder={m['mealPlan.shopping.itemName']()}
                bind:value={itemName}
                class="min-w-0"
                maxlength={100}
                disabled={busy}
                required
            />
            <Button aria-label={m['mealPlan.shopping.add']()} size="icon" type="submit" disabled={busy || !itemName.trim()}>
                <Plus class="size-4"/>
            </Button>
        </form>
    {/if}
    {#if actionError}
        <p role="alert" class="text-xs text-destructive">{actionError}</p>
    {/if}
    {#if loadFailed}
        <ErrorState message={m['mealPlan.shopping.loadError']()} onRetry={refresh}/>
    {:else if !data}
        <div class="flex justify-center py-8"><Spinner/></div>
    {:else if data.items.length === 0}
        <p class="py-6 text-center text-sm text-muted-foreground">{m['mealPlan.emptyShoppingList']()}</p>
    {:else}
        <div class="max-h-[60vh] flex-1 space-y-3 overflow-y-auto">
            {#each groups as group (group.label)}
                <div class="space-y-1.5">
                    <h3 class="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                    {#each group.items as item (item.id)}
                        <div class="rounded-lg border bg-card">
                            <button
                                role="checkbox"
                                aria-checked={item.checked}
                                disabled={busy}
                                class="flex min-h-11 w-full items-center justify-between rounded-t-lg p-2 text-left hover:bg-accent/50 {item.checked ? 'opacity-60' : ''}"
                                onclick={() => setStatus(item, item.checked ? 'open' : 'bought')}
                            >
                                <span class="min-w-0">
                                    <span id={`shopping-item-${item.id}`} class="block break-words text-sm font-medium {item.checked ? 'line-through' : ''}">{item.name}</span>
                                    {#if !item.manual}
                                        <span class="block text-xs text-muted-foreground">{formatQuantity(item.quantity)} {item.unit}</span>
                                    {/if}
                                    {#if item.quantityIncreased}
                                        <span class="block text-xs font-medium text-primary">{m['mealPlan.quantityIncreased']()}</span>
                                    {/if}
                                </span>
                                {#if item.checked}
                                    <Check class="ml-2 size-4 shrink-0 text-green-500"/>
                                {:else}
                                    <span aria-hidden="true" class="ml-2 text-xs text-muted-foreground">○</span>
                                {/if}
                            </button>
                            <div class="flex items-center justify-between px-1 pb-1">
                                <Button aria-describedby={`shopping-item-${item.id}`} aria-pressed={item.alreadyHave} disabled={busy} size="sm" variant={item.alreadyHave ? 'secondary' : 'ghost'} onclick={() => setStatus(item, item.alreadyHave ? 'open' : 'have')}>
                                    {#if item.alreadyHave}<Check class="size-3.5"/>{/if}
                                    {m['mealPlan.shopping.alreadyHave']()}
                                </Button>
                                {#if item.manual}
                                    <Button aria-label={m['mealPlan.shopping.removeItem']({name: item.name})} disabled={busy} size="icon" variant="ghost" onclick={() => change(() => removeShoppingItem({...scope, itemId: item.id}))}>
                                        <Trash2 class="size-4"/>
                                    </Button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    {/if}

    {#if data && !ownerId}
        <details class="border-t pt-2">
            <summary class="cursor-pointer py-2 text-sm font-semibold">{m['mealPlan.shopping.share']()}</summary>
            <p class="pb-2 text-xs text-muted-foreground">{m['mealPlan.shopping.shareHint']()}</p>
            <form class="flex flex-wrap gap-2" onsubmit={grant}>
                <Input aria-label={m['mealPlan.shopping.username']()} placeholder={m['mealPlan.shopping.username']()} bind:value={username} maxlength={100} required disabled={busy}/>
                <Button type="submit" size="sm" variant="outline" disabled={busy || !username.trim()}>{m['mealPlan.shopping.grant']()}</Button>
            </form>
            {#if invalidUsername}
                <p role="alert" class="pt-2 text-xs text-destructive">{m['mealPlan.shopping.userUnavailable']()}</p>
            {/if}
            {#if data.sharedWith.length}
                <ul class="pt-2">
                    {#each data.sharedWith as member (member.id)}
                        <li class="flex items-center justify-between gap-1 text-sm">
                            <span class="break-all">{member.username}</span>
                            <Button aria-label={m['mealPlan.shopping.revoke']({username: member.username})} disabled={busy} size="icon" variant="ghost" onclick={() => change(() => unshareShoppingList({memberId: member.id}))}>
                                <X class="size-4"/>
                            </Button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </details>
    {/if}
</section>
