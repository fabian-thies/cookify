<script lang="ts">
    import {FileArchive, FileText} from 'lucide-svelte';
    import * as Card from '$lib/components/ui/card';
    import {Button} from '$lib/components/ui/button';
    import {m} from '$lib/paraglide/messages';
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>{m['settings.export.title']()}</Card.Title>
        <Card.Description>{m['settings.export.description']()}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-2">
                <Button download href="/settings/export/cookbook.pdf">
                    <FileText class="size-4"/>
                    {m['settings.export.pdf']()}
                </Button>
                <Button download href="/settings/export/cookbook.zip" variant="outline">
                    <FileArchive class="size-4"/>
                    {m['settings.export.zip']()}
                </Button>
            </div>
            <div class="space-y-1 text-sm text-muted-foreground">
                <p>{m['settings.export.pdfHint']()}</p>
                <p>{m['settings.export.zipHint']()}</p>
            </div>
        </div>
    </Card.Content>
</Card.Root>
