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
        Users,
        ChefHat,
        Sparkles
    } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
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
    import {estimateNutrition} from "$lib/functions/ai.remote";
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
        shareEnabled?: boolean;
        tags?: string[];
        calories?: number | null;
        protein?: number | null;
        carbs?: number | null;
        fat?: number | null;
        fiber?: number | null;
        aiEnabled?: boolean;
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
        shareEnabled = false,
        tags = [],
        calories: initialCalories = null,
        protein: initialProtein = null,
        carbs: initialCarbs = null,
        fat: initialFat = null,
        fiber: initialFiber = null,
        aiEnabled = false
    }: props = $props();

    let averageRating = $state<number | null>(initialAverageRating);
    let ratingCount = $state(initialRatingCount);
    let userRating = $state<number | null>(initialUserRating);
    let favorite = $state(isFavorite);
    let isSavingFavorite = $state(false);
    let hoverRating = $state<number | null>(null);
    let isSubmittingRating = $state(false);
    let isSharing = $state(false);
    let isUpdatingShare = $state(false);
    let showDeleteDialog = $state(false);
    let showRatingDialog = $state(false);
    let isEstimatingNutrition = $state(false);
    let nutrition = $state({
        calories: initialCalories,
        protein: initialProtein,
        carbs: initialCarbs,
        fat: initialFat,
        fiber: initialFiber
    });
    const stars = [1, 2, 3, 4, 5] as const;
    let sharePathState = $state<string | null>(sharePath ?? null);
    let isShareEnabled = $state(shareEnabled || !!sharePathState);

    $effect(() => {
        if (showRatingDialog) {
            hoverRating = null;
        }
    });

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
            showRatingDialog = false;
            toast.success(m["recipe.common.ratingSaved"]());
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
        if (readonly || isSavingFavorite) {
            return;
        }

        isSavingFavorite = true;
        const previous = favorite;
        favorite = !favorite;

        try {
            await likeRecipe({recipeId});
        } catch (e) {
            favorite = previous;
            toast.error(m["actions.error"]());
        } finally {
            isSavingFavorite = false;
        }
    }

    async function estimateNutritionOnClick() {
        if (isEstimatingNutrition || !recipeOwner) {
            return;
        }

        try {
            isEstimatingNutrition = true;
            nutrition = await estimateNutrition({recipeId});
            toast.success(m["recipe.ai.nutrition.success"]());
        } catch {
            toast.error(m["recipe.ai.nutrition.error"]());
        } finally {
            isEstimatingNutrition = false;
        }
    }

    async function createCollectionOnClick() {
        try {
            await createCollection({title: "Collection"});
            toast.success(m["collection.created"]());
        } catch (e) {
            toast.error(m["actions.error"]());
        }
    }

    async function ensureSharePath(): Promise<string | null> {
        if (sharePathState) {
            return sharePathState;
        }

        if (!recipeOwner) {
            toast.error(m["actions.noShareLink"]());
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
            toast.success(m["actions.shareDisabled"]());
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
                toast.success(m["actions.linkShared"]());
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                toast.success(m["actions.linkCopied"]());
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

<div class="-mx-4 -mt-3 mb-6 sm:mx-0 sm:mt-0">
    <img alt={title} class="aspect-[3/2] w-full border-b border-border/60 object-cover sm:aspect-[2/1] sm:rounded-2xl sm:border" src={image}>
</div>

<div class="mb-6 w-full sm:mb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-8">
    <h1 class="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:col-start-1">{title}</h1>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground lg:col-start-1">
        <span class="flex items-center gap-1.5 font-medium text-foreground">
            <Star class="size-4" color="#fbbf24" fill="#fbbf24"/>
            {averageRating != null ? averageRating.toFixed(1) : "–"}
        </span>
        <span class="size-1 rounded-full bg-border"></span>
        <p>{m["recipe.common.reviews"]({count: ratingCount})}</p>
    </div>
    <p class="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base lg:col-start-1">{description}</p>

    <div class="mt-4 flex flex-wrap items-center gap-2 lg:col-start-1">
        <span class="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-[13px] font-medium">
            <Clock class="size-3.5 text-primary"/>
            {m["recipe.common.duration"]({count: cookingTime})}
        </span>
        <span class="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-[13px] font-medium">
            <Users class="size-3.5 text-primary"/>
            {m["recipe.common.servingsCount"]({count: servings})}
        </span>
        <span class="inline-flex h-8 items-center rounded-full border border-border/70 bg-card px-3 text-[13px] font-medium">
            {difficultyLabels[difficulty]}
        </span>
    </div>

    <div class="mt-4 flex items-center gap-2 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:self-start">
        {#if readonly}
            <Button class="flex-1 sm:flex-none" onclick={shareRecipeOnClick} size="lg" variant="secondary"
                    disabled={isSharing || isUpdatingShare || !sharePathState}>
                <Share2 class="size-4"/>
                {m["actions.share"]()}
            </Button>
        {:else}
            <Button class="flex-1 sm:flex-none" href="/recipe/{recipeId}/cook" size="lg">
                <ChefHat class="size-4"/>
                {m["recipe.cookMode.title"]()}
            </Button>
            <Button aria-label={m["nav.favorites"]()} aria-pressed={favorite} disabled={isSavingFavorite} onclick={likeRecipeOnClick} size="lg" variant="outline">
                <Heart class="size-4" fill={favorite ? "currentColor" : "none"}/>
                <span class="hidden sm:inline">{m["actions.save"]()}</span>
            </Button>
            <Dialog.Root bind:open={showRatingDialog}>
                <Dialog.Trigger aria-label={m["actions.rate"]()} class={buttonVariants({ variant: "outline", size: "lg" })}>
                    <Star
                            class="size-4"
                            color={userRating != null ? "#fbbf24" : "currentColor"}
                            fill={userRating != null ? "#fbbf24" : "none"}
                    />
                    <span class="hidden sm:inline">{m["actions.rate"]()}</span>
                </Dialog.Trigger>
                <Dialog.Content>
                    <Dialog.Header>
                        <Dialog.Title>{m["recipe.common.ratePrompt"]()}</Dialog.Title>
                        <Dialog.Description>
                            {m["recipe.common.rateSubtitle"]()}
                        </Dialog.Description>
                    </Dialog.Header>
                    <div class="flex flex-col items-center gap-4 py-2">
                        <div
                                class="flex items-center gap-1"
                                onmouseleave={() => hoverRating = null}
                                role="group">
                            {#each stars as star}
                                <button
                                        aria-label={m["recipe.common.rateStars"]({value: star})}
                                        class="cursor-pointer rounded-lg p-2 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                                        disabled={isSubmittingRating}
                                        onmouseenter={() => hoverRating = star}
                                        onmouseleave={() => hoverRating = null}
                                        onclick={() => handleRate(star)}
                                        type="button">
                                    <Star
                                            size={26}
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
            <DropdownMenu.Root>
                <DropdownMenu.Trigger aria-label={m["actions.more"]()} class={buttonVariants({variant: "outline", size: "icon"}) + " size-12"}>
                    <Ellipsis class="size-5"/>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="w-60">
                    <DropdownMenu.Group>
                        {#if recipeOwner}
                            <DropdownMenu.Item>
                                <a class="flex w-full items-center gap-2.5" href="/recipe/{recipeId}/edit">
                                    <Edit class="size-4 text-muted-foreground"/>
                                    <span>{m["actions.edit"]()}</span>
                                </a>
                            </DropdownMenu.Item>
                        {/if}
                        <DropdownMenu.Sub>
                            <DropdownMenu.SubTrigger>
                                <Plus class="size-4 text-muted-foreground"/>
                                <span>{m["actions.collections"]()}</span>
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.SubContent>
                                {#await getCollectionsForRecipe()}
                                    <div class="flex justify-center px-4 py-2 text-muted-foreground">
                                        <Spinner/>
                                    </div>
                                {:then collections}
                                    {#if collections.length === 0}
                                        <div class="px-4 py-2 text-sm text-muted-foreground">{m["actions.noCollectionsAvailable"]()}
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
                                    <div class="px-4 py-2 text-sm text-destructive">{m["actions.error"]()}</div>
                                {/await}
                                <DropdownMenu.Separator/>
                                <DropdownMenu.Item onclick={createCollectionOnClick}>
                                    <Plus class="size-4"/>
                                    <span>{m["actions.newCollection"]()}</span>
                                </DropdownMenu.Item>
                            </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                        <DropdownMenu.Item class="gap-2.5" disabled={isSharing || isUpdatingShare || (!sharePathState && !recipeOwner)}
                                           onclick={shareRecipeOnClick}>
                            <Share2 class="size-4 text-muted-foreground"/>
                            <span>{m["actions.share"]()}</span>
                        </DropdownMenu.Item>
                        {#if recipeOwner && isShareEnabled}
                            <DropdownMenu.Item class="gap-2.5" disabled={isUpdatingShare} onclick={disableShareOnClick}>
                                <Link2Off class="size-4 text-muted-foreground"/>
                                <span>{m["actions.disableSharing"]()}</span>
                            </DropdownMenu.Item>
                        {/if}
                        {#if recipeOwner && aiEnabled}
                            <DropdownMenu.Item class="gap-2.5" disabled={isEstimatingNutrition} onclick={estimateNutritionOnClick}>
                                <Sparkles class="size-4 text-muted-foreground"/>
                                <span>{m["recipe.ai.nutrition.button"]()}</span>
                            </DropdownMenu.Item>
                        {/if}
                        {#if recipeOwner}
                            <DropdownMenu.Separator/>
                            <DropdownMenu.Item class="gap-2.5 text-destructive" onclick={() => showDeleteDialog = true}>
                                <Trash2 class="size-4"/>
                                <span>{m["actions.delete"]()}</span>
                            </DropdownMenu.Item>
                        {/if}
                    </DropdownMenu.Group>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        {/if}
    </div>

    {#if tags.length > 0}
        <div class="mt-4 flex flex-wrap gap-1.5 lg:col-span-2">
            {#each tags as tag}
                <Badge variant="outline" href={"/recipe/search?tag=" + encodeURIComponent(tag)} class="min-h-11 max-w-full whitespace-normal break-words px-3 text-sm outline-none">{tag}</Badge>
            {/each}
        </div>
    {/if}

    {#if nutrition.calories != null || nutrition.protein != null || nutrition.carbs != null || nutrition.fat != null || nutrition.fiber != null}
        <div class="mt-5 flex flex-wrap items-center gap-1.5 lg:col-span-2">
            <span class="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{m["recipe.common.nutrition.title"]()}</span>
            {#if nutrition.calories != null}
                <Badge variant="secondary">{m["recipe.common.nutrition.calories"]({value: nutrition.calories})}</Badge>
            {/if}
            {#if nutrition.protein != null}
                <Badge variant="secondary">{m["recipe.common.nutrition.protein"]({value: nutrition.protein})}</Badge>
            {/if}
            {#if nutrition.carbs != null}
                <Badge variant="secondary">{m["recipe.common.nutrition.carbs"]({value: nutrition.carbs})}</Badge>
            {/if}
            {#if nutrition.fat != null}
                <Badge variant="secondary">{m["recipe.common.nutrition.fat"]({value: nutrition.fat})}</Badge>
            {/if}
            {#if nutrition.fiber != null}
                <Badge variant="secondary">{m["recipe.common.nutrition.fiber"]({value: nutrition.fiber})}</Badge>
            {/if}
        </div>
    {/if}
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
                <Button type="button" onclick={deleteRecipeOnClick} variant="destructive">{m["actions.deleteRecipe"]()}</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
