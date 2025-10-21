<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import {Bookmark} from "lucide-svelte";

    type Props = {
        collectionId: number;
        title: string;
        image: string;
    };

    let {collectionId, title, image}: Props = $props();
</script>

<a href="/collection/{collectionId}">
    <Card.Root class="flex h-full flex-col overflow-hidden rounded-lg bg-card p-4 gap-4">
        <Card.Header class="relative h-42 overflow-hidden p-0 rounded-lg">
            <img alt="" class="h-full w-full object-cover" src={image}>
        </Card.Header>
        <Card.Content class="flex-1 p-0">
            <div class="flex gap-2">
                <div class="flex-1 h-16 overflow-hidden rounded-lg">
                    <img alt="" class="h-full w-full object-cover" src={image}>
                </div>
                <div class="flex-1 h-16 overflow-hidden rounded-lg">
                    <img alt="" class="h-full w-full object-cover" src={image}>
                </div>
                <div class="flex-1 h-16 overflow-hidden rounded-lg">
                    <img alt="" class="h-full w-full object-cover" src={image}>
                </div>
            </div>
            <div class="flex justify-between mt-5">
                <h1 class="font-medium text-lg text-card-foreground">{title}</h1>
                <span class="text-sm text-muted-foreground flex flex-row gap-1 items-center">
                <Bookmark size={18}/>
                30
            </span>
            </div>
        </Card.Content>
    </Card.Root>
</a>