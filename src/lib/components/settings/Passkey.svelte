<script lang="ts">
    import {invalidateAll} from '$app/navigation';
    import {addPasskey} from '$lib/passkey';
    import {Button} from '$lib/components/ui/button/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import {m} from '$lib/paraglide/messages';
    import {toast} from 'svelte-sonner';
    import {Fingerprint, Plus, Trash2} from 'lucide-svelte';

    const {passkeys}: { passkeys: { id: string, createdAt: Date }[] } = $props();

    let busy = $state(false);

    async function handleAddPasskey() {
        busy = true;
        try {
            await addPasskey();
            await invalidateAll();
            toast.success(m['settings.passkey.added']());
        } catch (e) {
            console.error(e);
            toast.error(m['settings.passkey.error']());
        } finally {
            busy = false;
        }
    }
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>{m['settings.passkey.title']()}</Card.Title>
        <Card.Description>{m['settings.passkey.description']()}</Card.Description>
    </Card.Header>
    <Card.Content>
        <ul class="flex flex-col gap-2">
            {#each passkeys as passkey (passkey.id)}
                <li class="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div class="flex items-center gap-2">
                        <Fingerprint class="text-muted-foreground" size={16}/>
                        <span class="text-sm">{new Date(passkey.createdAt).toLocaleDateString()}</span>
                    </div>
                    <form action="?/deletePasskey" method="POST">
                        <input name="id" type="hidden" value={passkey.id}/>
                        <Button size="sm" type="submit" variant="ghost">
                            <Trash2 size={16}/>
                            <span class="sr-only">{m['settings.passkey.delete']()}</span>
                        </Button>
                    </form>
                </li>
            {:else}
                <li class="text-sm text-muted-foreground">{m['settings.passkey.empty']()}</li>
            {/each}
        </ul>
    </Card.Content>
    <Card.Footer>
        <Button disabled={busy} onclick={handleAddPasskey} type="button" variant="outline">
            <Plus size={16}/>
            {m['settings.passkey.add']()}
        </Button>
    </Card.Footer>
</Card.Root>
