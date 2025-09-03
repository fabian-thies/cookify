<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import {BookOpen, ChefHat, Clock, Minus, Plus, Timer, Users} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";

    const categories = [
        { value: "easy", label: "Easy" },
        { value: "medium", label: "Medium" },
        { value: "hard", label: "Hard" }
    ];
</script>

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="text-lg font-bold flex flex-row items-center gap-2">
            Rezept-Details
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex w-full flex-col gap-1.5">
            <Label for="title"><Clock size={18}/> Kochzeit</Label>
            <Input type="text" id="title" placeholder="z.B. Italienische Pasta Carbonara" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description"><Users size={18}/> Portionen</Label>
            <Input type="text" id="description" placeholder="Beschreiben Sie Ihr Rezept kurz" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="description">Schwierigkeitsgrad</Label>
            <SelectComponent
                    options={categories}
                    placeholder="Select a category"
                    groupLabel="Kategorien"
                    name="category"
                    class="w-full"/>
        </div>
    </Card.Content>
</Card.Root>