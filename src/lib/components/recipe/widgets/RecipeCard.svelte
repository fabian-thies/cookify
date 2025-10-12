<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import * as Card from "$lib/components/ui/card";
    import { m } from "$lib/paraglide/messages";
    import { Badge } from "$lib/components/ui/badge";
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

<Card.Root class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-card pt-0">
    <Card.Header class="relative h-52 overflow-hidden p-0">
        <Badge class="absolute right-3 top-3" variant="secondary">
            {difficultyLabels[difficulty] ?? difficulty}
        </Badge>
        <img class="h-full w-full object-cover" src={image} alt="">
    </Card.Header>
    <Card.Content class="flex-1">
        <h1 class="font-bold text-lg text-card-foreground">{title}</h1>
        <p class="text-sm pt-2 text-muted-foreground">{description}</p>
        <div class="flex gap-2 pt-2 justify-between">
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Clock size={15}/>
                {m["recipe.common.duration"]({ count: cookingTime })}
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <UserRound size={15} />
                {m["recipe.common.servingsCount"]({ count: servings })}
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
            {#if rating != null}
                    <Star size={15} fill="#fbbf24" color="#fbbf24"/>
                {rating}
            {/if}
            </span>
        </div>
        <!--<div class="flex gap-2 pt-4">
            <Badge variant="outline">Tags</Badge>
            <Badge variant="outline">Tags</Badge>
            <Badge variant="outline">Tags</Badge>
            <Badge variant="outline">...</Badge>
        </div>-->
    </Card.Content>
    <Card.Footer class="flex-col gap-2">
        <Button type="submit" class="w-full" href="/recipe/{id}" data-sveltekit-preload-data="hover">{m["recipe.card.view"]()}</Button>
    </Card.Footer>
</Card.Root>
