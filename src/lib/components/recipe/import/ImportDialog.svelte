<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {m} from "$lib/paraglide/messages";
    import {Spinner} from "$lib/components/ui/spinner/index.js";
    import {toast} from "svelte-sonner";

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
        tips?: string[];
        nutrition?: {
            calories: number | null;
            protein: number | null;
            carbs: number | null;
            fat: number | null;
            fiber: number | null;
        } | null;
        sourceUrl?: string | null;
    };

    let {
        onImport
    }: {
        onImport: (recipe: ScrapedRecipe) => void | Promise<void>;
    } = $props();

    let open = $state(false);
    let url = $state('');
    let loading = $state(false);
    let error = $state<string | null>(null);

    async function handleImport() {
        if (loading) return;
        const trimmedUrl = url.trim();

        if (!trimmedUrl) {
            error = m["recipe.import.urlRequired"]();
            return;
        }

        try {
            const parsed = new URL(trimmedUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
        } catch {
            error = m["recipe.import.invalidUrl"]();
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
                if (response.status === 404) {
                    error = m["recipe.import.noRecipe"]();
                } else {
                    error = m["recipe.import.scrapeError"]();
                }
                return;
            }

            const recipe: ScrapedRecipe = await response.json();
            await onImport(recipe);
            open = false;
            url = '';
            toast.success(m["recipe.import.success"]());
        } catch {
            error = m["recipe.import.scrapeError"]();
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

    <Dialog.Root bind:open onOpenChange={handleOpenChange}>
    <Dialog.Trigger class={buttonVariants({variant: "outline"}) + " w-full"}>
            {m["recipe.import.button"]()}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{m["recipe.import.title"]()}</Dialog.Title>
            <Dialog.Description>{m["recipe.import.description"]()}</Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-1.5">
                <Label for="import-url">{m["recipe.import.urlLabel"]()}</Label>
                <Input
                    id="import-url"
                    bind:value={url}
                    placeholder={m["recipe.import.urlPlaceholder"]()}
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
                <p role="alert" class="text-sm text-destructive">{error}</p>
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => open = false} disabled={loading} type="button">
                {m["actions.cancel"]()}
            </Button>
            <Button onclick={handleImport} disabled={loading} type="button">
                {#if loading}
                    <Spinner/>
                {:else}
                    {m["recipe.import.button"]()}
                {/if}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
