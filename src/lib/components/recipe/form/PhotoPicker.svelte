<script lang="ts">
    import {Camera, ImageIcon, Link, LoaderCircle} from "lucide-svelte";
    import {m} from "$lib/paraglide/messages";
    import {Input} from "$lib/components/ui/input";
    import {Button} from "$lib/components/ui/button";
    import * as Tabs from "$lib/components/ui/tabs";
    import {imageVariantUrl} from "$lib/images";

    let {image, required = false}: {image?: string; required?: boolean} = $props();
    let input: HTMLInputElement;
    let urlInput = $state<HTMLInputElement | null>(null);
    let files = $state<FileList>();
    let remoteFiles = $state<FileList>();
    let source = $state('upload');
    let pictureUrl = $state('');
    let remoteLoading = $state(false);
    let remoteError = $state(false);
    let previewUrl = $state('');
    let previewFailed = $state(false);
    const selectedFile = $derived(source === 'upload' ? files?.[0] : remoteFiles?.[0]);
    const tooLarge = $derived(!!selectedFile && selectedFile.size > 15 * 1024 * 1024);
    const hasSelection = $derived(!!selectedFile || (source === 'link' && !!pictureUrl));

    $effect(() => {
        const url = selectedFile ? URL.createObjectURL(selectedFile) : '';
        previewUrl = url;
        previewFailed = false;
        return () => { if (url) URL.revokeObjectURL(url); };
    });

    $effect(() => {
        input?.setCustomValidity(tooLarge ? m["recipe.form.details.photoTooLarge"]() : '');
    });

    $effect(() => {
        urlInput?.setCustomValidity(remoteLoading ? m["recipe.form.details.photoLoading"]()
            : remoteError ? m["recipe.form.details.photoImportError"]() : '');
    });

    $effect(() => {
        const url = pictureUrl.trim();
        remoteFiles = undefined;
        remoteError = false;
        remoteLoading = false;
        if (source !== 'link' || !url) return;
        try {
            if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error();
        } catch {
            // Native URL validation handles incomplete input while the user is typing.
            if (url.includes('://')) remoteError = true;
            return;
        }
        const controller = new AbortController();
        remoteLoading = true;
        const timer = setTimeout(async () => {
            try {
                const response = await fetch('/api/recipes/image', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({url}),
                    signal: controller.signal
                });
                if (!response.ok) throw new Error();
                const blob = await response.blob();
                if (controller.signal.aborted) return;
                const transfer = new DataTransfer();
                transfer.items.add(new File([blob], 'recipe-image.webp', {type: 'image/webp'}));
                remoteFiles = transfer.files;
            } catch {
                if (!controller.signal.aborted) remoteError = true;
            } finally {
                if (!controller.signal.aborted) remoteLoading = false;
            }
        }, 500);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    });

    function resetSelection() {
        if (source === 'link') {
            pictureUrl = '';
            urlInput?.focus();
        } else {
            input.value = '';
            files = undefined;
            input.dispatchEvent(new Event('change', {bubbles: true}));
            input.focus();
        }
    }
</script>

<div class="min-w-0 space-y-3">
    <p id="picture-label" class="text-sm font-medium">{m["recipe.form.details.previewLabel"]()}</p>
    <Tabs.Root bind:value={source} class="gap-3">
        <Tabs.List class="grid min-h-11 w-full grid-cols-2" aria-labelledby="picture-label">
            <Tabs.Trigger value="upload"><Camera class="size-4" aria-hidden="true"/>{m["recipe.form.details.photoUpload"]()}</Tabs.Trigger>
            <Tabs.Trigger value="link"><Link class="size-4" aria-hidden="true"/>{m["recipe.form.details.photoLink"]()}</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="upload">
            <div class="group relative overflow-hidden rounded-xl border border-border bg-muted/40 transition-colors hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                <input bind:this={input} bind:files id="picture" name="picture" type="file" accept="image/*"
                       disabled={source !== 'upload'} onchange={() => source = 'upload'} {required} aria-describedby="picture-hint picture-status"
                       aria-invalid={tooLarge} aria-label={selectedFile || image ? m["recipe.form.details.changePhoto"]() : m["recipe.form.details.choosePhoto"]()}
                       class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"/>
                {#if (previewUrl || image) && source === 'upload' && !previewFailed}
                    <img src={previewUrl || imageVariantUrl(image, 'medium')} alt={m["recipe.form.details.photoPreview"]()}
                         class="aspect-[4/3] w-full object-cover" decoding="async" onerror={() => previewFailed = true}/>
                {:else}
                    <div class="flex min-h-40 flex-col items-center justify-center gap-3 px-5 py-6 text-center">
                        <ImageIcon class="size-8 text-muted-foreground" aria-hidden="true"/>
                        {#if previewFailed}<p class="text-sm text-muted-foreground">{m["recipe.form.details.photoNoPreview"]()}</p>{/if}
                    </div>
                {/if}
                <div class="flex min-h-12 items-center justify-center gap-2 bg-background px-4 py-3 text-sm font-medium">
                    <Camera class="size-5 shrink-0 text-primary" aria-hidden="true"/>
                    {selectedFile || image ? m["recipe.form.details.changePhoto"]() : m["recipe.form.details.choosePhoto"]()}
                </div>
            </div>
            <p id="picture-hint" class="mt-2 text-sm text-muted-foreground">{m["recipe.form.details.photoHint"]()}</p>
        </Tabs.Content>
        <Tabs.Content value="link" class="space-y-3">
            <div class="space-y-2">
                <label for="pictureUrl" class="text-sm font-medium">{m["recipe.form.details.photoLink"]()}</label>
                <Input bind:ref={urlInput} id="pictureUrl" type="url" bind:value={pictureUrl}
                       placeholder="https://example.com/image.jpg" maxlength={2048} required={required}
                       disabled={source !== 'link'} onblur={() => {
                           if (urlInput?.validity.typeMismatch) remoteError = true;
                       }} aria-invalid={remoteError} aria-describedby="picture-url-hint picture-status"/>
                <p id="picture-url-hint" class="text-sm text-muted-foreground">{m["recipe.form.details.photoUrlHint"]()}</p>
            </div>
            <input type="file" name="picture" bind:files={remoteFiles} disabled={source !== 'link'} hidden/>
            <div class="overflow-hidden rounded-xl border border-border bg-muted/40" aria-busy={remoteLoading}>
                {#if remoteLoading}
                    <div class="flex aspect-[4/3] items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                        <LoaderCircle class="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true"/>
                        {m["recipe.form.details.photoLoading"]()}
                    </div>
                {:else if (previewUrl || (!pictureUrl && image)) && !previewFailed}
                    <img src={previewUrl || imageVariantUrl(image, 'medium')} alt={m["recipe.form.details.photoPreview"]()}
                         class="aspect-[4/3] w-full object-cover" decoding="async" onerror={() => previewFailed = true}/>
                {:else}
                    <div class="flex aspect-[4/3] items-center justify-center">
                        <ImageIcon class="size-8 text-muted-foreground" aria-hidden="true"/>
                    </div>
                {/if}
            </div>
        </Tabs.Content>
    </Tabs.Root>
    <div id="picture-status" aria-live="polite" class="space-y-2">
        {#if source === 'link' && (remoteError || previewFailed)}
            <p class="text-sm text-destructive">{m["recipe.form.details.photoImportError"]()}</p>
        {:else if source === 'link' && remoteFiles?.length && !remoteLoading}
            <p class="text-sm text-muted-foreground">{m["recipe.form.details.photoReady"]()}</p>
        {:else if source === 'upload' && selectedFile}
            <p class="break-all text-sm text-muted-foreground">{selectedFile.name}</p>
        {/if}
        {#if tooLarge}<p class="text-sm text-destructive">{m["recipe.form.details.photoTooLarge"]()}</p>{/if}
    </div>
    {#if hasSelection}
        <Button type="button" variant="outline" class="min-h-11 w-full" onclick={resetSelection}>
            {m["recipe.form.details.resetPhoto"]()}
        </Button>
    {/if}
</div>
