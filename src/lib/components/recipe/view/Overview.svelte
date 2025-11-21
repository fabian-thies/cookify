<script lang="ts">
    import {
        Clock,
        Edit,
        Ellipsis,
        Heart,
        Link2Off,
        Plus,
        Share2,
        Star,
        Trash2,
        Users
    } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import {Separator} from "$lib/components/ui/separator/index.js";
    import {Badge} from "$lib/components/ui/badge/index.js";
    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import {m} from "$lib/paraglide/messages";
    import {
        createCollection,
        deleteRecipe,
        getCollectionsForRecipe,
        likeRecipe,
        rateRecipe, toggleRecipeInCollection,
        enableRecipeShare,
        disableRecipeShare
    } from "$lib/functions/recipe.remote";
    import {toast} from "svelte-sonner";
    import {goto} from "$app/navigation";
    import {type Difficulty, difficultyLabels} from "$lib/types/recipe";
    import {Spinner} from "$lib/components/ui/spinner";

    type props = {
        id: number
        userId: string,
        title: string,
        description: string,
        difficulty: Difficulty,
        servings: number,
        cookingTime: number,
        image: string,
        isFavorite: boolean,
        recipeOwner: boolean,
        averageRating: number | null,
        ratingCount: number,
        userRating: number | null,
        readonly?: boolean,
        sharePath?: string,
        shareEnabled?: boolean
    };

    let {
        title,
        description,
        difficulty,
        servings,
        cookingTime,
        image,
        id: recipeId,
        isFavorite,
        recipeOwner,
        averageRating: initialAverageRating,
        ratingCount: initialRatingCount,
        userRating: initialUserRating,
        readonly = false,
        sharePath,
        shareEnabled = false
    }: props = $props();

    let averageRating = $state<number | null>(initialAverageRating);
    let ratingCount = $state(initialRatingCount);
    let userRating = $state<number | null>(initialUserRating);
    let hoverRating = $state<number | null>(null);
    let isSubmittingRating = $state(false);
    let isSharing = $state(false);
    let isUpdatingShare = $state(false);
    let showDeleteDialog = $state(false);
    const stars = [1, 2, 3, 4, 5] as const;
    let sharePathState = $state<string | null>(sharePath ?? null);
    let isShareEnabled = $state(shareEnabled || !!sharePathState);

    async function handleRate(value: number) {
        if (readonly || isSubmittingRating || value < 1 || value > 5) {
            return;
        }

        const previousUserRating = userRating;
        const previousAverage = averageRating;
        const previousCount = ratingCount;

        userRating = value;

        try {
            isSubmittingRating = true;
            const response = await rateRecipe({recipeId, rating: value});
            averageRating = response.average;
            ratingCount = response.count;
            userRating = response.rating;
        } catch (e) {
            userRating = previousUserRating;
            averageRating = previousAverage;
            ratingCount = previousCount;
            toast.error(m["actions.error"]());
        } finally {
            isSubmittingRating = false;
        }
    }

    function starFillColor(star: number) {
        const activeRating = hoverRating ?? userRating ?? 0;

        return star <= activeRating ? "#fbbf24" : "none";
    }

    function starStrokeColor(star: number) {
        const activeRating = hoverRating ?? userRating ?? 0;

        return star <= activeRating ? "#fbbf24" : "#9ca3af";
    }

    async function deleteRecipeOnClick() {
        try {
            await deleteRecipe({recipeId});

            await goto("/");
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }

    async function likeRecipeOnClick() {
        if (readonly) {
            return;
        }

        try {
            isFavorite = !isFavorite;
            await likeRecipe({recipeId});
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }

    async function createCollectionOnClick() {
        try {
            await createCollection({title: "Collection"});
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }

    async function ensureSharePath(): Promise<string | null> {
        if (sharePathState) {
            return sharePathState;
        }

        if (!recipeOwner) {
            toast.error("Kein Freigabelink verfügbar");
            return null;
        }

        if (readonly) {
            return null;
        }

        try {
            isUpdatingShare = true;
            const response = await enableRecipeShare({recipeId});
            const path = response.shareToken ? `/share/${response.shareToken}` : null;
            sharePathState = path;
            isShareEnabled = !!path;
            return path;
        } catch (error) {
            toast.error(m["actions.error"]());
            return null;
        } finally {
            isUpdatingShare = false;
        }
    }

    async function disableShareOnClick() {
        if (readonly || isUpdatingShare || !recipeOwner) {
            return;
        }

        try {
            isUpdatingShare = true;
            await disableRecipeShare({recipeId});
            sharePathState = null;
            isShareEnabled = false;
            toast.success("Freigabe deaktiviert");
        } catch (error) {
            toast.error(m["actions.error"]());
        } finally {
            isUpdatingShare = false;
        }
    }

    async function shareRecipeOnClick() {
        if (isSharing) {
            return;
        }

        const path = await ensureSharePath();

        if (!path) {
            return;
        }

        const shareUrl = `${location.origin}${path}`;

        try {
            isSharing = true;

            if (navigator.share && navigator.canShare?.({url: shareUrl})) {
                await navigator.share({
                    title,
                    text: description,
                    url: shareUrl
                });
                toast.success("Link geteilt");
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Link kopiert");
                return;
            }

            toast.error(m["actions.error"]());
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") {
                return;
            }
            toast.error(m["actions.error"]());
        } finally {
            isSharing = false;
        }
    }
</script>

<div class="w-full mt-4 md:mt-18">
    <h1 class="text-4xl font-bold">{title}</h1>
    <div class="text-muted-foreground h-5 flex items-center gap-4 mb-4 mt-4">
        <div class="flex items-center gap-2">
            <Star color="#fbbf24" fill="#fbbf24" size={20}/>
            <span>{averageRating != null ? averageRating.toFixed(1) : "–"}</span>
        </div>
        <Separator orientation="vertical"/>
        <p>{m["recipe.common.reviews"]({count: ratingCount})}</p>
    </div>
    <p class="text-lg text-muted-foreground mb-6">{description}
    </p>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 sm:gap-0">
        <div class="flex items-center flex-wrap gap-4 sm:gap-6 h-auto sm:h-5">
            <div class="flex items-center gap-2">
                <Clock size={18}/>
                <span class="font-medium">{m["recipe.common.duration"]({count: cookingTime})}</span>
            </div>
            <Separator class="hidden sm:block" orientation="vertical"/>
            <div class="flex items-center gap-2">
                <Users size={18}/>
                <span class="font-medium">{m["recipe.common.servingsCount"]({count: servings})}</span>
            </div>
            <Separator class="hidden sm:block" orientation="vertical"/>
            <div class="flex items-center gap-2">
                <Badge variant="secondary">
                    {difficultyLabels[difficulty]}
                </Badge>
            </div>
        </div>
        <div class="flex items-center flex-wrap gap-2">
            {#if readonly}
                <Button class="flex-1 sm:flex-none min-w-0" variant="secondary" onclick={shareRecipeOnClick}
                        disabled={isSharing || isUpdatingShare || !sharePathState}>
                    <Share2 class="w-4 h-4 sm:w-5 sm:h-5"/>
                    <span class="inline">{m["actions.share"]()}</span>
                </Button>
            {:else}
                <Dialog.Root>
                    <Dialog.Trigger
                            class={buttonVariants({ variant: "outline" }) + " flex-1 sm:flex-none min-w-0"}>
                        <Star
                                class="sm:w-[18px] sm:h-[18px]"
                                color={userRating != null ? "#fbbf24" : "currentColor"}
                                fill={userRating != null ? "#fbbf24" : "none"}
                                size={16}
                        />
                        <span class="hidden sm:inline">
                            {m["actions.rate"]()}
                        </span>
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{m["recipe.common.ratePrompt"]()}</Dialog.Title>
                            <Dialog.Description>
                                {m["recipe.common.rateSubtitle"]()}
                            </Dialog.Description>
                        </Dialog.Header>
                        <div class="flex flex-col items-center gap-4">
                            <div
                                    class="flex items-center gap-1"
                                    onmouseleave={() => hoverRating = null}
                                    role="group">
                                {#each stars as star}
                                    <button
                                            type="button"
                                            class="p-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                                            onmouseenter={() => hoverRating = star}
                                            onfocus={() => hoverRating = star}
                                            onblur={() => hoverRating = null}
                                            onmouseleave={() => hoverRating = null}
                                            onclick={() => handleRate(star)}
                                            disabled={isSubmittingRating}>
                                        <Star
                                                size={32}
                                                fill={starFillColor(star)}
                                                color={starStrokeColor(star)}
                                        />
                                    </button>
                                {/each}
                            </div>
                        </div>
                        <Dialog.Footer class="flex justify-end">
                            <Dialog.Close
                                    class={buttonVariants({ variant: "outline" })}
                                    onclick={() => hoverRating = null}>
                                {m["actions.cancel"]()}
                            </Dialog.Close>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Root>
                <Button class="flex-1 sm:flex-none min-w-0" onclick={likeRecipeOnClick}>
                    <Heart class="w-4 h-4 sm:w-5 sm:h-5" fill={isFavorite ? "white" : "none"}/>
                    <span class="inline">{m["actions.save"]()}</span>
                </Button>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Button variant="ghost">
                            <Ellipsis/>
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Group>
                            {#if recipeOwner}
                                <DropdownMenu.Item>
                                    <a href="/recipe/{recipeId}/edit" class="flex items-center gap-3">
                                        <Edit size={16} class="sm:w-[18px] sm:h-[18px]"/>
                                        <span class="inline">{m["actions.edit"]()}</span>
                                    </a>
                                </DropdownMenu.Item>
                            {/if}
                            <DropdownMenu.Group>
                                <DropdownMenu.Sub>
                                    <DropdownMenu.SubTrigger>
                                        <Plus class="w-4 h-4 sm:w-5 sm:h-5"/>
                                        <span class="inline">Kollektionen</span>
                                    </DropdownMenu.SubTrigger>
                                    <DropdownMenu.SubContent>
                                        {#await getCollectionsForRecipe()}
                                            <div class="px-4 py-2 flex justify-center text-muted-foreground">
                                                <Spinner/>
                                            </div>
                                        {:then collections}
                                            {#if collections.length === 0}
                                                <div class="px-4 py-2 text-sm text-muted-foreground">Keine Kollektionen
                                                </div>
                                            {:else}
                                                {#each collections as collection}
                                                    <DropdownMenu.Group>
                                                        <DropdownMenu.CheckboxItem checked={collection.isInCollection}
                                                                                   onclick={async () => {await toggleRecipeInCollection({collectionId: collection.id})}}>
                                                            {collection.title}
                                                        </DropdownMenu.CheckboxItem>
                                                    </DropdownMenu.Group>
                                                {/each}
                                            {/if}
                                        {:catch error}
                                            <div class="px-4 py-2 text-sm text-red-500">{m["actions.error"]}</div>
                                        {/await}
                                        <DropdownMenu.Separator/>
                                        <DropdownMenu.Item onclick={createCollectionOnClick}>
                                            <Plus class="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span class="inline">Neue Kollektion</span></DropdownMenu.Item>
                                    </DropdownMenu.SubContent>
                                </DropdownMenu.Sub>
                            </DropdownMenu.Group>
                            <DropdownMenu.Item class="flex items-center gap-3" onclick={shareRecipeOnClick}
                                               disabled={isSharing || isUpdatingShare || (!sharePathState && !recipeOwner)}>
                                <Share2 class="w-4 h-4 sm:w-5 sm:h-5"/>
                                <span class="inline">{m["actions.share"]()}</span>
                            </DropdownMenu.Item>
                            {#if recipeOwner && isShareEnabled}
                                <DropdownMenu.Item class="flex items-center gap-3"
                                                   onclick={disableShareOnClick}
                                                   disabled={isUpdatingShare}>
                                    <Link2Off class="w-4 h-4 sm:w-5 sm:h-5"/>
                                    <span class="inline">Freigabe beenden</span>
                                </DropdownMenu.Item>
                            {/if}
                            {#if recipeOwner}
                                <DropdownMenu.Item class="flex items-center gap-3" onclick={() => showDeleteDialog = true}>
                                    <Trash2 size={16} class="sm:w-[18px] sm:h-[18px]"/>
                                    <span class="inline">{m["actions.delete"]()}</span>
                                </DropdownMenu.Item>
                            {/if}
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            {/if}
        </div>
    </div>
    <div class="mb-6">
        <img alt="" class="w-full h-96 object-cover rounded-lg shadow-lg border" src={image}>
    </div>
</div>

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
                <Button type="button" onclick={deleteRecipeOnClick}>{m["actions.deleteRecipe"]()}</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
