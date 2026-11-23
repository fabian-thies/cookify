<script lang="ts">
    import {onMount} from 'svelte';
    import {toast} from 'svelte-sonner';
    import {Button} from '$lib/components/ui/button';
    import * as Card from '$lib/components/ui/card';
    import {Textarea} from '$lib/components/ui/textarea';
    import {getRecipeNote, saveRecipeNote} from '$lib/functions/recipe.remote';
    import {m} from '$lib/paraglide/messages';

    const {recipeId}: {recipeId: number} = $props();
    let draft = $state('');
    let saved = $state('');
    let loading = $state(true);
    let failed = $state(false);
    let saving = $state(false);

    async function load() {
        loading = true;
        failed = false;
        try {
            draft = saved = await getRecipeNote({recipeId}).run();
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (saving || draft.trim() === saved) return;
        saving = true;
        try {
            draft = saved = await saveRecipeNote({recipeId, note: draft});
            toast.success(m['recipe.note.saved']());
        } catch {
            toast.error(m['recipe.note.saveError']());
        } finally {
            saving = false;
        }
    }

    onMount(() => queueMicrotask(load));
</script>

<Card.Root class="mt-4">
    <Card.Header>
        <h2 class="text-base font-semibold"><label for="personal-recipe-note">{m['recipe.note.title']()}</label></h2>
        <p id="personal-recipe-note-hint" class="text-sm text-muted-foreground">{m['recipe.note.private']()}</p>
    </Card.Header>
    <Card.Content>
        {#if loading}
            <p role="status" class="text-sm text-muted-foreground">{m.loading()}</p>
        {:else if failed}
            <p role="alert" class="mb-2 text-sm text-destructive">{m['recipe.note.loadError']()}</p>
            <Button size="sm" variant="outline" onclick={load}>{m['actions.retry']()}</Button>
        {:else}
            <form class="space-y-3" onsubmit={save}>
                <Textarea id="personal-recipe-note" aria-describedby="personal-recipe-note-hint"
                          rows={3} maxlength={4000} bind:value={draft} readonly={saving}/>
                <Button size="sm" type="submit" disabled={saving || draft.trim() === saved}>{m['actions.save']()}</Button>
            </form>
        {/if}
    </Card.Content>
</Card.Root>
