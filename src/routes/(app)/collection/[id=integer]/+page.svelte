<script lang="ts">
    import RecipeList from "$lib/components/recipe/widgets/RecipeList.svelte";
    import {
        deleteCollection,
        deleteRecipe,
        getCollectionsForRecipe, setCollectionTitle,
        toggleRecipeInCollection
    } from "$lib/functions/recipe.remote";
    import {Edit, Ellipsis, Plus, Share2, Trash2} from "lucide-svelte";
    import {Spinner} from "$lib/components/ui/spinner/index";
    import {Button, buttonVariants} from "$lib/components/ui/button/index";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import {m} from "$lib/paraglide/messages";
    import {goto, invalidateAll} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {Label} from "$lib/components/ui/label";
    import {Input} from "$lib/components/ui/input";

    const {data} = $props();
    const collectionOwner = data.user!.id === data.collection.userId;

    let showDeleteDialog = $state(false);
    let showEditDialog = $state(false);

    // Edit Variables
    let newTitle = $state(data.collection.collectionTitle);
    let isSaving = $state(false);

    async function deleteCollectionOnClick() {
        try {
            await deleteCollection({collectionId: data.collection.id});

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
                collectionId: data.collection.id
            });

            await invalidateAll();

            showEditDialog = false;
            isSaving = false;
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }
</script>

<RecipeList recipes={data.collection.recipes} title={data.collection.collectionTitle} showFilters={false}>
    {#snippet actions()}
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="ghost">
                    <Ellipsis/>
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

{#if showEditDialog}
    <Dialog.Root bind:open={showEditDialog}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Kollektion bearbeiten</Dialog.Title>
            </Dialog.Header>
            <div class="grid gap-2 py-4">
                <Label for="title">Titel</Label>
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
                <Dialog.Title>{m["actions.deleteRecipe"]()}</Dialog.Title>
                <Dialog.Description>
                    {m["actions.confirmDelete"]()}
                </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
                <Dialog.Close class={buttonVariants({ variant: "outline" })}>
                    {m["actions.cancel"]()}
                </Dialog.Close>
                <Button type="button"
                        onclick={async () => {await deleteCollectionOnClick()}}>{m["actions.deleteRecipe"]()}</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
