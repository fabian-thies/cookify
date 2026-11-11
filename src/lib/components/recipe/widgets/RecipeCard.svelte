<script lang="ts">
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

<a
        class="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-colors hover:border-border hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href="/recipe/{id}"
>
    <div class="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
                alt={title}
                class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                loading="lazy"
                src={image}
        >
        <Badge class="absolute right-2.5 top-2.5 border-transparent bg-background/75 text-foreground backdrop-blur-md" variant="secondary">
            {difficultyLabels[difficulty] ?? difficulty}
        </Badge>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
        <h3 class="line-clamp-2 text-base font-medium leading-snug tracking-tight">{title}</h3>
        <p class="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {#if tags.length > 0}
            <p class="truncate text-xs text-muted-foreground">{tags.slice(0, 3).join(" · ")}</p>
        {/if}
        <div class="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
                <Clock class="size-3.5 text-primary"/>
                {m["recipe.common.duration"]({count: cookingTime})}
            </span>
            <span class="size-0.5 shrink-0 rounded-full bg-muted-foreground/40"></span>
            <span class="flex items-center gap-1">
                <UserRound class="size-3.5 text-primary"/>
                {m["recipe.common.servingsCount"]({count: servings})}
            </span>
            {#if rating != null}
                <span class="ml-auto flex items-center gap-1 font-medium text-foreground">
                    <Star class="size-3.5" fill="currentColor"/>
                    {rating}
                </span>
            {/if}
        </div>
    </div>
</a>
