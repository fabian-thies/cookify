<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {BookOpen, ChefHat, Minus, Plus} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";

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
            <Input type="text" id="title" placeholder="z.B. Italienische Pasta Carbonara" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description">Beschreibung</Label>
            <Input type="text" id="description" placeholder="Beschreiben Sie Ihr Rezept kurz" />
        </div>
    </Card.Content>
</Card.Root>