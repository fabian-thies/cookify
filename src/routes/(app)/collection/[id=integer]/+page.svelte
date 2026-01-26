<script lang="ts">
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {
        deleteCollection,
        deleteRecipe,
        getCollectionsForRecipe, setCollectionTitle,
        toggleRecipeInCollection,
        getCollectionRecipes
    } from "$lib/functions/recipe.remote";
    import {Edit, PencilIcon, Trash2} from "lucide-svelte";
    import {Spinner} from "$lib/components/ui/spinner/index";
    import {Button, buttonVariants} from "$lib/components/ui/button/index";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {Label} from "$lib/components/ui/label";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";

    const {data} = $props();

    let collection = $state(null);
    let collectionOwner = $state(false);
    let loading = $state(true);
    const userId = data.user.id;

    let showDeleteDialog = $state(false);
    let showEditDialog = $state(false);

    // Edit Variables
    let newTitle = $state("");
    let isSaving = $state(false);

    $effect(() => {
        const collectionId = Number($page.params.id);
        getCollectionRecipes({collectionId}).then((result) => {
            collection = {...result, id: collectionId};
            collectionOwner = data.user!.id === result.userId;
            newTitle = result.collectionTitle;
            loading = false;
        }).catch((error) => {
            console.error('Failed to load collection:', error);
            toast.error(m.actions.loadCollectionError());
        });
    });

    async function deleteCollectionOnClick() {
        try {
            await deleteCollection({collectionId: collection.id});

            await goto("/collection");
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }

    async function setCollectionTitleOnClick() {
        try {
            isSaving = true;

            await setCollectionTitle({
                title: newTitle,
                collectionId: collection.id
            });

            // Reload collection data
            const collectionId = Number($page.params.id);
            const result = await getCollectionRecipes({collectionId});
            collection = {...result, id: collectionId};
            newTitle = result.collectionTitle;

            showEditDialog = false;
            isSaving = false;

            toast.success(m["settings.profile.saved"]());
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }
</script>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{m.loading()}</div>
    </div>
{:else if collection}
    <RecipeList {userId} recipes={collection.recipes} title={collection.collectionTitle} showFilters={false}>
    {#snippet actions()}
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="outline">
                    <PencilIcon></PencilIcon>
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Group>
                    {#if collectionOwner}
                        <DropdownMenu.Item onclick={() => showEditDialog = true}>
                            <Edit size={16} class="sm:w-[18px] sm:h-[18px]"/>
                            <span class="inline">{m["actions.edit"]()}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item class="flex items-center gap-3" onclick={() => showDeleteDialog = true}>
                            <Trash2 size={16} class="sm:w-[18px] sm:h-[18px]"/>
                            <span class="inline">{m["actions.delete"]()}</span>
                        </DropdownMenu.Item>
                    {/if}
                </DropdownMenu.Group>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    {/snippet}
</RecipeList>
{/if}

{#if showEditDialog}
    <Dialog.Root bind:open={showEditDialog}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>
                    <h2>
                        {m["collection.editDialog.title"]()}
                    </h2>
                </Dialog.Title>
            </Dialog.Header>
            <div class="grid gap-2 py-4">
                <Label for="title">{m["collection.editDialog.titleLabel"]()}</Label>
                <Input id="title" name="title" bind:value={newTitle} required/>
            </div>
            <Dialog.Footer>
                <Dialog.Close class={buttonVariants({ variant: "outline" })}>
                    {m["actions.cancel"]()}
                </Dialog.Close>
                <Button type="button" onclick={async () => {await setCollectionTitleOnClick()}}>
                    {#if isSaving}
                        <Spinner class="mr-2"/>
                    {:else}
                        {m["actions.save"]()}
                    {/if}
                </Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}

{#if showDeleteDialog}
    <Dialog.Root bind:open={showDeleteDialog}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>{m["collection.deleteDialog.title"]()}</Dialog.Title>
                <Dialog.Description>
                    {m["collection.deleteDialog.description"]()}
                </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
                <Dialog.Close class={buttonVariants({ variant: "outline" })}>
                    {m["actions.cancel"]()}
                </Dialog.Close>
                <Button type="button"
                        onclick={async () => {await deleteCollectionOnClick()}}>{m["collection.deleteDialog.confirm"]()}</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
