<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import {m} from "$lib/paraglide/messages";
    import {Badge} from "$lib/components/ui/badge";
    import {Clock, Star, UserRound} from "lucide-svelte";
    import {type Difficulty, difficultyLabels} from "$lib/types/recipe";

    type Props = {
        id: number;
        title: string;
        description: string;
        image: string;
        servings: number;
        cookingTime: number;
        rating?: number;
        difficulty: Difficulty;
        tags?: string[];
    };
    let {id, title, description, image, servings, cookingTime, rating, difficulty, tags = []}: Props = $props();
</script>

<Card.Root class="flex h-full w-full flex-col overflow-hidden rounded-xl bg-card pt-0 pb-0 gap-0 shadow-sm">
    <Card.Header class="relative aspect-video w-full overflow-hidden p-0">
        <Badge class="absolute right-2.5 top-2.5" variant="secondary">
            {difficultyLabels[difficulty] ?? difficulty}
        </Badge>
        <img alt={title} class="h-full w-full object-cover" loading="lazy" src={image}>
    </Card.Header>
    <Card.Content class="flex-1 px-3.5 pt-3.5 sm:px-4 sm:pt-4">
        <h1 class="font-medium text-base text-card-foreground sm:text-lg">{title}</h1>
        <p class="text-sm pt-1.5 text-muted-foreground line-clamp-2">{description}</p>
        {#if tags.length > 0}
            <div class="flex flex-wrap gap-1.5 pt-2">
                {#each tags.slice(0, 3) as tag}
                    <Badge variant="outline" class="text-[10px] px-2 py-0.5">{tag}</Badge>
                {/each}
                {#if tags.length > 3}
                    <Badge variant="outline" class="text-[10px] px-2 py-0.5">+{tags.length - 3}</Badge>
                {/if}
            </div>
        {/if}
        <div class="flex gap-2 pt-3 mt-3 border-t border-border/50 justify-between">
            <span class="text-xs sm:text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Clock size={15} class="text-primary"/>
                {m["recipe.common.duration"]({count: cookingTime})}
            </span>
            <span class="text-xs sm:text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <UserRound size={15} class="text-primary"/>
                {m["recipe.common.servingsCount"]({count: servings})}
            </span>
            <span class="text-xs sm:text-sm text-muted-foreground flex flex-row gap-1 items-center">
            {#if rating != null}
                    <Star size={15} fill="#fbbf24" color="#fbbf24"/>
                {rating}
            {/if}
            </span>
        </div>
    </Card.Content>
    <Card.Footer class="flex-col gap-2 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <Button class="w-full" data-sveltekit-preload-data="hover" href="/recipe/{id}"
                type="submit">{m["recipe.card.view"]()}</Button>
    </Card.Footer>
</Card.Root>
