<script lang="ts">
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {Textarea} from "$lib/components/ui/textarea";
    import * as Card from "$lib/components/ui/card/index.js";
    import {ChefHat} from "lucide-svelte";
    import {m} from "$lib/paraglide/messages";
    import {MAX_RECIPE_SOURCE_URL_LENGTH} from "$lib/recipe-source";

    let {recipe, sourceUrl = $bindable("")}: {recipe?: any; sourceUrl?: string} = $props();

    let description = $state(recipe?.description ?? '');
</script>

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            <ChefHat/>
            <h2>
                {m["recipe.form.general.title"]()}
            </h2>
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="title">{m["recipe.form.general.nameLabel"]()}</Label>
            <Input id="title" name="title" placeholder={m["recipe.form.general.namePlaceholder"]()} required type="text"
                   value={recipe?.title || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description">{m["recipe.form.general.descriptionLabel"]()}</Label>
            <Textarea id="description" name="description" placeholder={m["recipe.form.general.descriptionPlaceholder"]()}
                   bind:value={description} />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="sourceUrl">{m["recipe.form.general.sourceUrlLabel"]()}</Label>
            <Input id="sourceUrl" name="sourceUrl" type="url" maxlength={MAX_RECIPE_SOURCE_URL_LENGTH}
                   placeholder={m["recipe.import.urlPlaceholder"]()} bind:value={sourceUrl}/>
        </div>
    </Card.Content>
</Card.Root>
