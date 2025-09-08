<script lang="ts">
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { ChefHat } from "lucide-svelte";
</script>

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            <ChefHat />
            Grundinformationen
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="title">Rezeptname</Label>
            <Input type="text" id="title" name="title" placeholder="z.B. Italienische Pasta Carbonara" required />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description">Beschreibung</Label>
            <Input type="text" id="description" name="description" placeholder="Beschreibe dein Rezept kurz" required/>
        </div>
    </Card.Content>
</Card.Root>