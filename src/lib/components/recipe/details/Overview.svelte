<script lang="ts">
    import {Clock, Heart, Share2, Star, Users} from "lucide-svelte";
    import {Separator} from "$lib/components/ui/separator/index.js";
    import {Badge} from "$lib/components/ui/badge/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {likeRecipe} from "$lib/functions/recipe.remote";

    type props = {
        id: number
        userId: string,
        title: string,
        description: string,
        difficulty: string | null,
        servings: number,
        cookingTime: number,
        image: string,
        isFavorite: boolean
    };

    let {title, description, difficulty, servings, cookingTime, image, userId, id: recipeId, isFavorite}: props = $props();
</script>

<div class="w-full">
    <h1 class="text-4xl font-bold">{title}</h1>
    <div class="text-muted-foreground h-5 flex items-center gap-4 mb-4 mt-4">
        <Star size={20} fill="#fbbf24" color="#fbbf24"/>
        (4.8)
        <Separator orientation="vertical"/>
        <p>128 Bewertungen</p>
    </div>
    <p class="text-lg text-muted-foreground mb-6">{description}
    </p>

    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center space-x-6 h-5">
            <div class="flex items-center gap-2">
                <Clock size={18}/>
                <span class="font-medium">{cookingTime} min</span>
            </div>
            <Separator orientation="vertical"/>
            <div class="flex items-center gap-2">
                <Users size={18}/>
                <span class="font-medium">{servings} Portionen</span>
            </div>
            <Separator orientation="vertical"/>
            <div class="flex items-center gap-2">
                <Badge variant="secondary">{difficulty}</Badge>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <Button variant="outline">
                <Share2/>
                Teilen
            </Button>
            <Button onclick={async () => {
                try {
                    isFavorite = !isFavorite;

                    await likeRecipe({userId, recipeId});
                } catch (e) {

                }
            }}>
                <Heart fill={isFavorite ? "white" : "none"} />
                Speichern
            </Button>
        </div>
    </div>
    <div class="mb-6">
        <img class="w-full h-96 object-cover rounded-lg shadow-lg border" src="https://picsum.photos/1500/1500" alt="">
    </div>
</div>