<script>
    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import {Plus} from "lucide-svelte";
</script>
<Card.Root class="w-full">
    <Card.Header class="flex items-center gap-4">
        <Card.Title class="flex flex-col gap-2">
            <h1 class="text-lg font-bold">
                Zubereitung
            </h1>
            <p class="text-sm text-muted-foreground">Schritt für Schritt Anleitung</p>
        </Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <div class="flex flex-row gap-6">
            <div class="flex w-full max-w-10 flex-col gap-1.5">
                <div class="flex flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full items-center justify-center text-sm font-medium">
                    1
                </div>
            </div>
            <div class="flex w-full flex-col gap-1.5">
                1aedgasgs
            </div>
        </div>
    </Card.Content>
    <Card.Footer>
    </Card.Footer>
</Card.Root>