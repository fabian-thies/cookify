<script>
    import * as Card from "$lib/components/ui/card/index.js";
</script>

<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="flex flex-col gap-2">
            <h1 class="text-lg font-bold">
                Zutaten
            </h1>
            <p class="text-sm text-muted-foreground">Für n Portionen</p>
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <ul class="space-y-3">
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">400g</span><span
                    class="text-sm">Spaghetti</span></li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">200g</span><span class="text-sm">Pancetta oder Speck, gewürfelt</span>
            </li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">4</span><span class="text-sm">Eigelb</span>
            </li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">1</span><span
                    class="text-sm">ganzes Ei</span></li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">100g</span><span class="text-sm">Parmigiano-Reggiano, gerieben</span>
            </li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">2 EL</span><span
                    class="text-sm">Olivenöl</span></li>
            <li class="flex items-start gap-3 py-1"><span
                    class="font-semibold text-primary min-w-[60px] text-sm">2</span><span class="text-sm">Knoblauchzehen, gehackt</span>
            </li>
        </ul>
    </Card.Content>
    <Card.Footer>
    </Card.Footer>
</Card.Root>