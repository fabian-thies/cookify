<script lang="ts">
    import {Clock, Edit, Heart, Share2, Star, Users} from "lucide-svelte";
    import {Separator} from "$lib/components/ui/separator/index.js";
    import {Badge} from "$lib/components/ui/badge/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import { m } from "$lib/paraglide/messages";
    import {likeRecipe} from "$lib/functions/recipe.remote";
    import {toast} from "svelte-sonner";
    import {type Difficulty, difficultyLabels} from "$lib/types/recipe";

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
        recipeOwner: boolean
    };

    let {title, description, difficulty, servings, cookingTime, image, userId, id: recipeId, isFavorite, recipeOwner }: props = $props();
</script>

<div class="w-full">
    <h1 class="text-4xl font-bold">{title}</h1>
    <div class="text-muted-foreground h-5 flex items-center gap-4 mb-4 mt-4">
        <Star size={20} fill="#fbbf24" color="#fbbf24"/>
        (4.8)
        <Separator orientation="vertical"/>
        <p>{m["recipe.common.reviews"]({ count: 128 })}</p>
    </div>
    <p class="text-lg text-muted-foreground mb-6">{description}
    </p>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 sm:gap-0">
        <div class="flex items-center flex-wrap gap-4 sm:gap-6 h-auto sm:h-5">
            <div class="flex items-center gap-2">
                <Clock size={18}/>
                <span class="font-medium">{m["recipe.common.duration"]({ count: cookingTime })}</span>
            </div>
            <Separator orientation="vertical" class="hidden sm:block"/>
            <div class="flex items-center gap-2">
                <Users size={18}/>
                <span class="font-medium">{m["recipe.common.servingsCount"]({ count: servings })}</span>
            </div>
            <Separator orientation="vertical" class="hidden sm:block"/>
            <div class="flex items-center gap-2">
                <Badge variant="secondary">
                    {difficultyLabels[difficulty] ?? difficulty}
                </Badge>
            </div>
        </div>
        <div class="flex items-center flex-wrap gap-2">
            <Button variant="outline" class="flex-1 sm:flex-none min-w-0">
                <Share2 class="w-4 h-4 sm:w-5 sm:h-5"/>
                <span class="hidden sm:inline">{m["actions.share"]()}</span>
            </Button>
            <Button onclick={async () => {
            try {
                isFavorite = !isFavorite;
                await likeRecipe({userId, recipeId});
            } catch (e) {
                toast.error(m["actions.error"]());
            }
        }} class="flex-1 sm:flex-none min-w-0">
                <Heart fill={isFavorite ? "white" : "none"} class="w-4 h-4 sm:w-5 sm:h-5"/>
                <span class="hidden sm:inline">{m["actions.save"]()}</span>
            </Button>
            {#if recipeOwner}
                <Button variant="outline" href="/recipe/{recipeId}/edit" class="flex-1 sm:flex-none min-w-0">
                    <Edit size={16} class="sm:w-[18px] sm:h-[18px]"/>
                    <span class="hidden sm:inline">{m["actions.edit"]()}</span>
                </Button>
            {/if}
        </div>
    </div>
    <div class="mb-6">
        <img class="w-full h-96 object-cover rounded-lg shadow-lg border" src={image} alt="">
    </div>
</div>