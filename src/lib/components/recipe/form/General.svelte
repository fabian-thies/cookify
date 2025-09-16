<script lang="ts">
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { ChefHat } from "lucide-svelte";
    import { m } from "$lib/paraglide/messages";

    const { recipe } = $props();
</script>

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            <ChefHat />
            {m["recipe.form.general.title"]()}
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="title">{m["recipe.form.general.nameLabel"]()}</Label>
            <Input type="text" id="title" name="title" placeholder={m["recipe.form.general.namePlaceholder"]()} required value={recipe?.title || ''}/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description">{m["recipe.form.general.descriptionLabel"]()}</Label>
            <Input type="text" id="description" name="description" placeholder={m["recipe.form.general.descriptionPlaceholder"]()} required value={recipe?.description || ''}/>
        </div>
    </Card.Content>
</Card.Root>