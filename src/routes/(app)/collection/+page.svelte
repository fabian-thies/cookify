<script lang="ts">
    import ErrorState from "$lib/components/ErrorState.svelte";
    import CollectionCard from "$lib/components/collection/CollectionCard.svelte";
    import CollectionCardSkeleton from "$lib/components/collection/CollectionCardSkeleton.svelte";
    import {createCollection, getCollections} from "$lib/functions/recipe.remote";
    import {Button} from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import {Input} from "$lib/components/ui/input";
    import {Label} from "$lib/components/ui/label";
    import {m} from "$lib/paraglide/messages";
    import {FolderPlus, Plus} from "lucide-svelte";
    import {toast} from "svelte-sonner";

    type CollectionWithMeta = {
        id: number;
        userId: string;
        title: string;
        recipeCount: number;
        isInCollection: boolean;
        thumbnails: string[];
    };

    let collections = $state<CollectionWithMeta[]>([]);
    let loading = $state(true);
    let failed = $state(false);

    let showCreate = $state(false);
    let newTitle = $state("");
    let creating = $state(false);

    async function loadCollections() {
        collections = await getCollections().run() as CollectionWithMeta[];
    }

    async function reloadCollections() {
        loading = true;
        failed = false;
        try {
            await loadCollections();
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    $effect(() => { queueMicrotask(reloadCollections); });

    async function createCollectionOnClick() {
        const title = newTitle.trim();
        if (!title || creating) return;

        try {
            creating = true;
            await createCollection({title});
            await loadCollections();
            showCreate = false;
            newTitle = "";
            toast.success(m["collection.created"]());
        } catch {
            toast.error(m["actions.error"]());
        } finally {
            creating = false;
        }
    }
</script>

<div class="mt-2 flex flex-col gap-5">
    <div class="flex items-center justify-between gap-3">
        <h1 class="page-title">{m["nav.collection"]()}</h1>
        <Button onclick={() => showCreate = true} class="min-h-11" variant="outline">
            <Plus class="size-4"/>
            {m["collection.new"]()}
        </Button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {#each Array(8) as _}
                <CollectionCardSkeleton/>
            {/each}
        </div>
    {:else if failed}
        <ErrorState message={m["actions.loadCollectionError"]()} onRetry={reloadCollections}/>
    {:else if collections.length === 0}
        <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
            <div class="flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderPlus class="size-5 text-muted-foreground"/>
            </div>
            <p class="text-sm text-muted-foreground">{m["collection.noCollections"]()}</p>
            <Button onclick={() => showCreate = true} class="min-h-11" variant="outline">
                <Plus class="size-4"/>
                {m["collection.new"]()}
            </Button>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {#each collections as {title, recipeCount, id, thumbnails}}
                <CollectionCard images={thumbnails} collectionId={id} recipeCount={recipeCount} {title}/>
            {/each}
        </div>
    {/if}
</div>

<Dialog.Root bind:open={showCreate}>
    <Dialog.Content>
        <form class="flex flex-col gap-5" onsubmit={(e) => { e.preventDefault(); createCollectionOnClick(); }}>
            <Dialog.Header>
                <Dialog.Title>{m["collection.createTitle"]()}</Dialog.Title>
            </Dialog.Header>
            <div class="grid gap-2">
                <Label for="collection-title">{m["collection.nameLabel"]()}</Label>
                <Input
                        bind:value={newTitle}
                        id="collection-title"
                        maxlength={100}
                        placeholder={m["collection.namePlaceholder"]()}
                        required
                />
            </div>
            <Dialog.Footer>
                <Dialog.Close class="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-accent" type="button">
                    {m["actions.cancel"]()}
                </Dialog.Close>
                <Button disabled={creating || !newTitle.trim()} type="submit">
                    {m["collection.create"]()}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
