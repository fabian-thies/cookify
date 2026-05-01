<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {m} from "$lib/paraglide/messages";
    import {Spinner} from "$lib/components/ui/spinner/index.js";

    type ScrapedRecipe = {
        title: string;
        description: string;
        image: string | null;
        cookTime: number | null;
        servings: number | null;
        difficulty: string | null;
        ingredients: { name: string; amount: number | null; unit: string }[];
        steps: string[];
        tags: string[];
        sourceUrl: string;
    };

    let {
        onImport
    }: {
        onImport: (recipe: ScrapedRecipe) => void;
    } = $props();

    let open = $state(false);
    let url = $state('');
    let loading = $state(false);
    let error = $state<string | null>(null);

    async function handleImport() {
        const trimmedUrl = url.trim();

        if (!trimmedUrl) {
            error = (m as any)['recipe.import.urlRequired']();
            return;
        }

        try {
            new URL(trimmedUrl);
        } catch {
            error = (m as any)['recipe.import.invalidUrl']();
            return;
        }

        loading = true;
        error = null;

        try {
            const response = await fetch('/api/recipes/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trimmedUrl })
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 404) {
                    error = (m as any)['recipe.import.noRecipe']();
                } else {
                    error = (m as any)['recipe.import.scrapeError']();
                }
                return;
            }

            const recipe: ScrapedRecipe = await response.json();
            onImport(recipe);
            open = false;
            url = '';
        } catch {
            error = (m as any)['recipe.import.scrapeError']();
        } finally {
            loading = false;
        }
    }

    function handleOpenChange(value: boolean) {
        open = value;
        if (!value) {
            error = null;
        }
    }
</script>

    <Dialog.Root bind:open>
    <Dialog.Trigger class="w-full">
        <Button variant="outline" type="button" class="w-full">
            {(m as any)['recipe.import.button']()}
        </Button>
    </Dialog.Trigger>
    <Dialog.Content onopenChange={handleOpenChange}>
        <Dialog.Header>
            <Dialog.Title>{(m as any)['recipe.import.title']()}</Dialog.Title>
            <Dialog.Description>{(m as any)['recipe.import.description']()}</Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-1.5">
                <Label for="import-url">{(m as any)['recipe.import.urlLabel']()}</Label>
                <Input
                    id="import-url"
                    bind:value={url}
                    placeholder={(m as any)['recipe.import.urlPlaceholder']()}
                    type="url"
                    disabled={loading}
                    onkeydown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImport();
                        }
                    }}
                />
            </div>
            {#if error}
                <p class="text-sm text-destructive">{error}</p>
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => open = false} disabled={loading} type="button">
                {m['actions.cancel']()}
            </Button>
            <Button onclick={handleImport} disabled={loading} type="button">
                {#if loading}
                    <Spinner/>
                {:else}
                    {(m as any)['recipe.import.button']()}
                {/if}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
