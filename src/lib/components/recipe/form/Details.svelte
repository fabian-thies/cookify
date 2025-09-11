<script lang="ts">
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {Clock, Users, X} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {Badge} from "$lib/components/ui/badge";

    const { recipe } = $props();

    const difficulties = [
        { value: "easy", label: "Einfach" },
        { value: "medium", label: "Mittel" },
        { value: "hard", label: "Schwierig" }
    ];

    type TagLike = { name: string };
    let tagInput = $state("");
    let tags = $state<string[]>(recipe?.tags?.map((t: TagLike) => t.name) ?? []);

    const addTag = () => {
        const value = tagInput.trim();
        if (value && !tags.includes(value)) {
            tags = [...tags, value];
        }
        tagInput = "";
    };

    const removeTag = (index: number) => {
        tags = tags.filter((_, i) => i !== index);
    };

    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === "," || event.key === " ") {
            event.preventDefault();
            addTag();
        } else if (event.key === "Backspace" && tagInput === "") {
            tags = tags.slice(0, -1);
        }
    };
</script>

<Card.Root class="w-full b">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            Rezept-Details
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="cookTime"><Clock size={18}/> Kochzeit (Min.)</Label>
            <Input type="number" id="cookTime" name="cookTime" min="0" placeholder="z.B. 25" required value={recipe?.cookingTime || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="servings"><Users size={18}/> Portionen</Label>
            <Input type="number" id="servings" name="servings" min="1" placeholder="z.B. 4" required value={recipe?.servings || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="difficulty">Schwierigkeitsgrad</Label>
            <SelectComponent
                    id="difficulty"
                    name="difficulty"
                    options={difficulties}
                    placeholder="Wähle Schwierigkeitsgrad"
                    groupLabel="Schwierigkeitsgrad"
                    class="w-full" value={recipe?.difficulty.toLowerCase() || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="tagInput">Tags</Label>
            <Input
                    bind:value={tagInput}
                    id="tagInput"
                    onkeydown={handleKeydown}
                    placeholder="Tag eingeben und Enter drücken"
                    type="text"
            />
            {#if tags.length > 0}
                <div class="flex flex-wrap gap-2 mt-2">
                    {#each tags as tag, index}
                        <Badge class="flex items-center gap-1 cursor-pointer" onclick={() => removeTag(index)}>
                            {tag}
                            <X class="h-3 w-3"/>
                            <input type="hidden" name="tags[]" value={tag}/>
                        </Badge>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="picture">Vorschaubild</Label>
            <Input id="picture" type="file" accept="image/*" name="picture" required={!recipe}/>
        </div>
    </Card.Content>
</Card.Root>
