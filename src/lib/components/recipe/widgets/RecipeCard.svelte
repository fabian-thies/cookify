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
    };
    let {id, title, description, image, servings, cookingTime, rating, difficulty}: Props = $props();
</script>

<Card.Root class="group flex h-full w-full flex-col overflow-hidden rounded-lg bg-card pt-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-primary/20">
    <Card.Header class="relative aspect-video w-full overflow-hidden p-0">
        <Badge class="absolute right-3 top-3" variant="secondary">
            {difficultyLabels[difficulty] ?? difficulty}
        </Badge>
        <img alt={title} class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src={image}>
    </Card.Header>
    <Card.Content class="flex-1">
        <h1 class="font-medium text-lg text-card-foreground group-hover:text-primary transition-colors duration-200">{title}</h1>
        <p class="text-sm pt-2 pb-2 text-muted-foreground">{description}</p>
        <div class="flex gap-2 pt-3 mt-3 border-t border-border/50 justify-between">
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Clock size={15} class="text-primary"/>
                {m["recipe.common.duration"]({count: cookingTime})}
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <UserRound size={15} class="text-primary"/>
                {m["recipe.common.servingsCount"]({count: servings})}
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
            {#if rating != null}
                    <Star size={15} fill="#fbbf24" color="#fbbf24"/>
                {rating}
            {/if}
            </span>
        </div>
    </Card.Content>
    <Card.Footer class="flex-col gap-2">
        <Button class="w-full" data-sveltekit-preload-data="hover" href="/recipe/{id}"
                type="submit">{m["recipe.card.view"]()}</Button>
    </Card.Footer>
</Card.Root>
