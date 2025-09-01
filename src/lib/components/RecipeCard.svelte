<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import {Clock, Star, UserRound} from "lucide-svelte";

    type Props = {
        title: string;
        description: string;
        image: string;
        serves: number;
        cookingTime: number;
        rating: number;
    };
    let { title, description, image, serves, cookingTime, rating }: Props = $props();

</script>

<Card.Root class="w-full max-w-sm pt-0 overflow-hidden rounded-lg bg-card">
    <Card.Header class="p-0 max-h-52 overflow-hidden">
        <img src={image} alt="">
    </Card.Header>
    <Card.Content>
        <h1 class="font-bold text-lg text-card-foreground">{title}</h1>
        <p class="text-sm pt-2 text-muted-foreground">{description}</p>
        <div class="flex gap-2 pt-2 justify-between">
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Clock size={15}/>
                {cookingTime} Min
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <UserRound size={15} />
                {serves} Portionen
            </span>
            <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Star size={15} fill="#fbbf24" color="#fbbf24"/>
                {rating}
            </span>
        </div>
        <div class="flex gap-2 pt-4">
            <Badge variant="outline">Badge</Badge>
        </div>
    </Card.Content>
    <Card.Footer class="flex-col gap-2">
        <Button type="submit" class="w-full" href="/">Rezept ansehen</Button>
    </Card.Footer>
</Card.Root>