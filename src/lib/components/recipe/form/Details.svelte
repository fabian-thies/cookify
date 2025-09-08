<script lang="ts">
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Clock, Users } from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";

    const difficulties = [
        { value: "easy", label: "Einfach" },
        { value: "medium", label: "Mittel" },
        { value: "hard", label: "Schwierig" }
    ];

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
            <Input type="number" id="cookTime" name="cookTime" min="0" placeholder="z.B. 25" required />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="servings"><Users size={18}/> Portionen</Label>
            <Input type="number" id="servings" name="servings" min="1" placeholder="z.B. 4" required/>
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="difficulty">Schwierigkeitsgrad</Label>
            <SelectComponent
                    id="difficulty"
                    name="difficulty"
                    options={difficulties}
                    placeholder="Wähle Schwierigkeitsgrad"
                    groupLabel="Schwierigkeitsgrad"
                    class="w-full" />
        </div>
        <div class="flex w-full flex-col gap-1.5">
            <Label for="picture">Vorschaubild</Label>
            <Input id="picture" type="file" accept="image/*" name="picture" required/>
        </div>
    </Card.Content>
</Card.Root>
