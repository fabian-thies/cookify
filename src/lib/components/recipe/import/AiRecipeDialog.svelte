<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Textarea} from "$lib/components/ui/textarea/index.js";
    import {Checkbox} from "$lib/components/ui/checkbox/index.js";
    import {Spinner} from "$lib/components/ui/spinner/index.js";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {m} from "$lib/paraglide/messages";
    import {toast} from "svelte-sonner";
    import {Sparkles} from "lucide-svelte";
    import type {AiRecipeResult} from "$lib/types/ai";

    let {
        onImport
    }: {
        onImport: (recipe: AiRecipeResult) => void | Promise<void>;
    } = $props();

    let open = $state(false);
    let tab = $state("text");
    let prompt = $state("");
    let fileList = $state<FileList | undefined>(undefined);
    let mode = $state("recipe-photo");
    let useAsCover = $state(false);
    let loading = $state(false);
    let error = $state<string | null>(null);
    let controller: AbortController | null = null;

    $effect(() => {
        useAsCover = mode === "dish-photo";
    });

    const photoModes = $derived([
        {value: "recipe-photo", label: m["recipe.ai.photoModes.recipe"]()},
        {value: "dish-photo", label: m["recipe.ai.photoModes.dish"]()},
        {value: "ingredients-photo", label: m["recipe.ai.photoModes.ingredients"]()}
    ]);

    function reset() {
        error = null;
    }

    async function handleGenerate() {
        error = null;

        const formData = new FormData();
        formData.append("action", "generate");

        if (tab === "text") {
            if (!prompt.trim()) {
                error = m["recipe.ai.error"]();
                return;
            }
            formData.append("mode", "text");
            formData.append("prompt", prompt.trim());
        } else {
            const file = fileList?.[0];
            if (!file) {
                error = m["recipe.ai.error"]();
                return;
            }
            formData.append("mode", mode);
            formData.append("image", file);
        }

        loading = true;
        controller = new AbortController();
        let coverUrl: string | null = null;

        try {
            const response = await fetch("/api/ai/recipe", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error("AI request failed");
            }

            const recipe = await response.json() as AiRecipeResult;

            if (tab === "photo" && useAsCover && fileList?.[0]) {
                coverUrl = URL.createObjectURL(fileList[0]);
                recipe.image = coverUrl;
            }

            await onImport(recipe);
            open = false;
            prompt = "";
            fileList = undefined;
            toast.success(m["recipe.ai.success"]());
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                error = m["recipe.ai.error"]();
            }
        } finally {
            if (coverUrl) URL.revokeObjectURL(coverUrl);
            loading = false;
            controller = null;
        }
    }
</script>

<Dialog.Root bind:open onOpenChange={(value) => {
    if (!value) {
        controller?.abort();
        reset();
    }
}}>
    <Dialog.Trigger class="w-full">
        <Button variant="outline" type="button" class="w-full gap-2">
            <Sparkles size={16}/>
            {m["recipe.ai.button"]()}
        </Button>
    </Dialog.Trigger>
    <Dialog.Content class="sm:max-w-[550px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Sparkles size={18}/>
                {m["recipe.ai.title"]()}
            </Dialog.Title>
            <Dialog.Description>{m["recipe.ai.description"]()}</Dialog.Description>
        </Dialog.Header>

        <Tabs.Root bind:value={tab} class="mt-2">
            <Tabs.List>
                <Tabs.Trigger value="text">{m["recipe.ai.tabs.text"]()}</Tabs.Trigger>
                <Tabs.Trigger value="photo">{m["recipe.ai.tabs.photo"]()}</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="text" class="flex flex-col gap-4 mt-4">
                <div class="flex flex-col gap-1.5">
                    <Label for="ai-prompt">{m["recipe.ai.promptLabel"]()}</Label>
                    <Textarea
                        id="ai-prompt"
                        bind:value={prompt}
                        placeholder={m["recipe.ai.promptPlaceholder"]()}
                        disabled={loading}
                        rows={4}
                    />
                    <p class="text-xs text-muted-foreground">{m["recipe.ai.coverHint"]()}</p>
                </div>
            </Tabs.Content>

            <Tabs.Content value="photo" class="flex flex-col gap-4 mt-4">
                <div class="flex flex-col gap-1.5">
                    <Label for="ai-photo">{m["recipe.ai.photoLabel"]()}</Label>
                    <Input
                        id="ai-photo"
                        type="file"
                        accept="image/*"
                        bind:files={fileList}
                        disabled={loading}
                    />
                </div>

                <div class="flex flex-col gap-1.5">
                    <Label for="ai-photo-mode">{m["recipe.ai.photoModeLabel"]()}</Label>
                    <SelectComponent
                        class="w-full"
                        name="ai-photo-mode"
                        options={photoModes}
                        bind:value={mode}
                        disabled={loading}
                    />
                </div>

                <div class="flex items-center gap-2">
                    <Checkbox id="ai-use-cover" bind:checked={useAsCover} disabled={loading}/>
                    <Label for="ai-use-cover">{m["recipe.ai.useAsCover"]()}</Label>
                </div>
            </Tabs.Content>
        </Tabs.Root>

        {#if error}
            <p class="text-sm text-destructive mt-3">{error}</p>
        {/if}

        <Dialog.Footer>
            <Button variant="outline" onclick={() => open = false} disabled={loading} type="button">
                {m["actions.cancel"]()}
            </Button>
            <Button onclick={handleGenerate} disabled={loading} type="button" class="gap-2">
                {#if loading}
                    <Spinner/>
                    {m["recipe.ai.generating"]()}
                {:else}
                    <Sparkles size={16}/>
                    {m["recipe.ai.generate"]()}
                {/if}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
