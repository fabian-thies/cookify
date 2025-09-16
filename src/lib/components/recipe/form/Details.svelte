<script lang="ts">
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { m } from "$lib/paraglide/messages";
    import {Clock, Users, X} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {Badge} from "$lib/components/ui/badge";

    const { recipe } = $props();

    const difficulties = [
        { value: "easy", label: m["recipe.common.difficulty.easy"]() },
        { value: "medium", label: m["recipe.common.difficulty.medium"]() },
        { value: "hard", label: m["recipe.common.difficulty.hard"]() }
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
            {m["recipe.form.details.title"]()}
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="cookTime"><Clock size={18}/> {m["recipe.form.details.cookTimeLabel"]()}</Label>
            <Input type="number" id="cookTime" name="cookTime" min="0" placeholder={m["recipe.form.details.cookTimePlaceholder"]()} required value={recipe?.cookingTime || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="servings"><Users size={18}/> {m["recipe.form.details.servingsLabel"]()}</Label>
            <Input type="number" id="servings" name="servings" min="1" placeholder={m["recipe.form.details.servingsPlaceholder"]()} required value={recipe?.servings || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="difficulty">{m["recipe.form.details.difficultyGroupLabel"]()}</Label>
            <SelectComponent
                    id="difficulty"
                    name="difficulty"
                    options={difficulties}
                    placeholder={m["recipe.form.details.difficultyPlaceholder"]()}
                    groupLabel={m["recipe.form.details.difficultyGroupLabel"]()}
                    class="w-full" value={recipe?.difficulty.toLowerCase() || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="tagInput">{m["recipe.form.details.tagsLabel"]()}</Label>
            <Input
                    bind:value={tagInput}
                    id="tagInput"
                    onkeydown={handleKeydown}
                    placeholder={m["recipe.form.details.tagsPlaceholder"]()}
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
            <Label for="picture">{m["recipe.form.details.previewLabel"]()}</Label>
            <Input id="picture" type="file" accept="image/*" name="picture" required={!recipe}/>
        </div>
    </Card.Content>
</Card.Root>
