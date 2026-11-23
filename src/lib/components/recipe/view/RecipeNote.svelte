<script lang="ts">
    import {onMount} from 'svelte';
    import {NotebookPen} from 'lucide-svelte';
    import {toast} from 'svelte-sonner';
    import {Button} from '$lib/components/ui/button';
    import * as Card from '$lib/components/ui/card';
    import {Spinner} from '$lib/components/ui/spinner';
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

<Card.Root class="mt-4 w-full sm:mt-6">
    <Card.Header class="border-b border-border/60 pb-4">
        <Card.Title class="flex flex-col gap-1">
            <h2 class="flex items-center gap-2 text-base font-semibold">
                <NotebookPen class="size-4 text-primary" aria-hidden="true"/>
                <label for="personal-recipe-note">{m['recipe.note.title']()}</label>
            </h2>
            <p id="personal-recipe-note-hint" class="text-sm font-normal text-muted-foreground">{m['recipe.note.private']()}</p>
        </Card.Title>
    </Card.Header>
    <Card.Content>
        {#if loading}
            <div role="status" class="flex items-center justify-center py-6">
                <Spinner/>
                <span class="sr-only">{m.loading()}</span>
            </div>
        {:else if failed}
            <div class="space-y-3">
                <p role="alert" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{m['recipe.note.loadError']()}</p>
                <Button size="sm" variant="outline" onclick={load}>{m['actions.retry']()}</Button>
            </div>
        {:else}
            <form class="space-y-3" onsubmit={save}>
                <Textarea
                    id="personal-recipe-note"
                    aria-describedby="personal-recipe-note-hint"
                    rows={3}
                    maxlength={4000}
                    bind:value={draft}
                    readonly={saving}
                />
                <div class="flex justify-end">
                    <Button size="sm" type="submit" disabled={saving || draft.trim() === saved}>
                        {#if saving}<Spinner/>{:else}{m['actions.save']()}{/if}
                    </Button>
                </div>
            </form>
        {/if}
    </Card.Content>
</Card.Root>
