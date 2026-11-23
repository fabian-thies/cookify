<script lang="ts">
    import {onMount} from 'svelte';
    import {Check, ChevronDown, Plus, Share2, Trash2, X} from 'lucide-svelte';
    import ErrorState from '$lib/components/ErrorState.svelte';
    import {Button} from '$lib/components/ui/button';
    import {Input} from '$lib/components/ui/input';
    import SelectComponent from '$lib/components/ui/select/SelectComponent.svelte';
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
    let shareOpen = $state(false);
    let request = 0;

    const scope = $derived({ownerId: ownerId || undefined, weekStart});
    const data = $derived(result?.week === weekStart && result.owner === ownerId ? result.data : undefined);
    const listOptions = $derived([
        {value: '', label: m['mealPlan.shopping.ownList']()},
        ...(result?.data.sharedBy ?? []).map(owner => ({
            value: owner.id,
            label: m['mealPlan.shopping.sharedList']({username: owner.username}),
        })),
    ]);
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

    async function refresh(resetError = false) {
        if (busy) return;
        const version = ++request;
        const week = weekStart;
        const owner = ownerId;
        const revision = planRevision;
        if (resetError || !data) loadFailed = false;

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
        queueMicrotask(() => refresh(true));
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
        invalidUsername = false;
        void change(async () => {
            invalidUsername = !await shareShoppingList({username: exactUsername});
            if (!invalidUsername) username = '';
        });
    }

    function formatQuantity(quantity: number) {
        return Number(quantity.toFixed(2)).toString();
    }
</script>

<section aria-label={m['mealPlan.shoppingList']()} class="order-first flex w-full shrink-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 lg:order-none lg:w-72">
    <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">{m['mealPlan.shoppingList']()}</h2>
        <Button aria-label={m['mealPlan.shopping.close']()} class="size-9 text-muted-foreground" size="icon" variant="ghost" onclick={onClose}>
            <X class="size-4"/>
        </Button>
    </div>

    {#if result?.data.sharedBy.length}
        <SelectComponent
            options={listOptions}
            bind:value={ownerId}
            groupLabel={m['mealPlan.shopping.listLabel']()}
            placeholder={m['mealPlan.shopping.ownList']()}
            class="w-full"
            disabled={busy}
        />
    {/if}

    {#if data}
        <form class="flex min-w-0 items-center gap-2" onsubmit={addItem}>
            <Input
                aria-label={m['mealPlan.shopping.itemName']()}
                placeholder={m['mealPlan.shopping.itemName']()}
                bind:value={itemName}
                class="min-w-0 flex-1"
                maxlength={100}
                disabled={busy}
                required
            />
            <Button aria-label={m['mealPlan.shopping.add']()} class="shrink-0" size="icon" type="submit" disabled={busy || !itemName.trim()}>
                <Plus class="size-4"/>
            </Button>
        </form>
    {/if}
    {#if actionError}
        <p role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{actionError}</p>
    {/if}
    {#if loadFailed}
        <ErrorState message={m['mealPlan.shopping.loadError']()} onRetry={() => refresh(true)}/>
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
                        <div class="rounded-lg border border-border/60 bg-card transition-colors hover:border-border">
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={item.checked}
                                disabled={busy}
                                class="flex min-h-11 w-full items-center justify-between gap-2 rounded-t-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/40 {item.checked || item.alreadyHave ? 'opacity-65' : ''}"
                                onclick={() => setStatus(item, item.checked ? 'open' : 'bought')}
                            >
                                <span class="min-w-0">
                                    <span id={`shopping-item-${item.id}`} class="block break-words text-sm font-medium {item.checked || item.alreadyHave ? 'line-through' : ''}">{item.name}</span>
                                    {#if !item.manual}
                                        <span class="block text-xs text-muted-foreground">
                                            {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                                        </span>
                                    {/if}
                                    {#if item.quantityIncreased}
                                        <span class="mt-0.5 inline-block text-xs font-medium text-primary">{m['mealPlan.quantityIncreased']()}</span>
                                    {/if}
                                </span>
                                <span
                                    aria-hidden="true"
                                    class="flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors {item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}"
                                >
                                    {#if item.checked}
                                        <Check class="size-3"/>
                                    {/if}
                                </span>
                            </button>
                            <div class="flex items-center justify-between gap-1 border-t border-border/40 px-1.5 py-1">
                                <Button
                                    aria-describedby={`shopping-item-${item.id}`}
                                    aria-pressed={item.alreadyHave}
                                    class="h-8 px-2 text-xs {item.alreadyHave ? 'text-foreground' : 'text-muted-foreground'}"
                                    disabled={busy}
                                    size="sm"
                                    variant={item.alreadyHave ? 'secondary' : 'ghost'}
                                    onclick={() => setStatus(item, item.alreadyHave ? 'open' : 'have')}
                                >
                                    {#if item.alreadyHave}<Check class="size-3.5 text-primary"/>{/if}
                                    {m['mealPlan.shopping.alreadyHave']()}
                                </Button>
                                {#if item.manual}
                                    <Button
                                        aria-label={m['mealPlan.shopping.removeItem']({name: item.name})}
                                        class="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        disabled={busy}
                                        size="icon"
                                        variant="ghost"
                                        onclick={() => change(() => removeShoppingItem({...scope, itemId: item.id}))}
                                    >
                                        <Trash2 class="size-3.5"/>
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
        <div class="border-t border-border/60 pt-2">
            <button
                type="button"
                aria-expanded={shareOpen}
                class="flex min-h-10 w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-sm font-semibold transition-colors hover:bg-accent/50"
                onclick={() => shareOpen = !shareOpen}
            >
                <span class="flex items-center gap-2">
                    <Share2 class="size-4 text-primary" aria-hidden="true"/>
                    {m['mealPlan.shopping.share']()}
                </span>
                <ChevronDown class="size-4 text-muted-foreground transition-transform {shareOpen ? 'rotate-180' : ''}" aria-hidden="true"/>
            </button>
            {#if shareOpen}
                <div class="mt-2 space-y-2.5">
                    <p class="text-xs leading-relaxed text-muted-foreground">{m['mealPlan.shopping.shareHint']()}</p>
                    <form class="flex min-w-0 items-center gap-2" onsubmit={grant}>
                        <Input
                            aria-label={m['mealPlan.shopping.username']()}
                            placeholder={m['mealPlan.shopping.username']()}
                            bind:value={username}
                            oninput={() => invalidUsername = false}
                            class="min-w-0 flex-1"
                            maxlength={100}
                            required
                            disabled={busy}
                        />
                        <Button class="shrink-0" type="submit" size="sm" variant="outline" disabled={busy || !username.trim()}>
                            {m['mealPlan.shopping.grant']()}
                        </Button>
                    </form>
                    {#if invalidUsername}
                        <p role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{m['mealPlan.shopping.userUnavailable']()}</p>
                    {/if}
                    {#if data.sharedWith.length}
                        <ul class="space-y-1.5">
                            {#each data.sharedWith as member (member.id)}
                                <li class="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-sm">
                                    <span class="min-w-0 truncate">{member.username}</span>
                                    <Button
                                        aria-label={m['mealPlan.shopping.revoke']({username: member.username})}
                                        class="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        disabled={busy}
                                        size="icon"
                                        variant="ghost"
                                        onclick={() => change(() => unshareShoppingList({memberId: member.id}))}
                                    >
                                        <X class="size-4"/>
                                    </Button>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</section>
