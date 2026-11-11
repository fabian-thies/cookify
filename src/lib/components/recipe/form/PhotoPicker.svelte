<script lang="ts">
    import {Camera, ImageIcon} from "lucide-svelte";
    import {m} from "$lib/paraglide/messages";
    import {Button} from "$lib/components/ui/button";

    let {image, required = false}: {image?: string; required?: boolean} = $props();
    let input: HTMLInputElement;
    let files = $state<FileList>();
    let previewUrl = $state("");
    let previewFailed = $state(false);
    const selectedFile = $derived(files?.[0]);
    const tooLarge = $derived(!!selectedFile && selectedFile.size > 15 * 1024 * 1024);

    $effect(() => {
        const url = selectedFile ? URL.createObjectURL(selectedFile) : "";
        previewUrl = url;
        previewFailed = false;
        return () => { if (url) URL.revokeObjectURL(url); };
    });

    $effect(() => {
        input?.setCustomValidity(tooLarge ? m["recipe.form.details.photoTooLarge"]() : "");
    });

    function resetSelection() {
        input.value = "";
        files = undefined;
        input.dispatchEvent(new Event("change", {bubbles: true}));
        input.focus();
    }
</script>

<div class="min-w-0 space-y-3">
    <label for="picture" class="text-sm font-medium">{m["recipe.form.details.previewLabel"]()}</label>
    <div class="group relative overflow-hidden rounded-xl border border-border bg-muted/40 transition-colors hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <input
            bind:this={input} bind:files id="picture" name="picture" type="file" accept="image/*"
            {required} aria-describedby="picture-hint picture-status" aria-invalid={tooLarge}
            aria-label={previewUrl || image ? m["recipe.form.details.changePhoto"]() : m["recipe.form.details.choosePhoto"]()}
            class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        {#if (previewUrl || image) && !previewFailed}
            <img src={previewUrl || image} alt={m["recipe.form.details.photoPreview"]()}
                 class="aspect-[4/3] w-full object-cover" onerror={() => previewFailed = true}/>
        {:else}
            <div class="flex min-h-40 flex-col items-center justify-center gap-3 px-5 py-6 text-center">
                <div class="flex size-12 items-center justify-center rounded-full bg-background text-primary">
                    <ImageIcon class="size-6" aria-hidden="true"/>
                </div>
                {#if previewFailed}
                    <p class="text-sm text-muted-foreground">{m["recipe.form.details.photoNoPreview"]()}</p>
                {/if}
            </div>
        {/if}
        <div class="flex min-h-12 items-center justify-center gap-2 bg-background px-4 py-3 text-sm font-medium text-foreground">
            <Camera class="size-5 shrink-0 text-primary" aria-hidden="true"/>
            {previewUrl || image ? m["recipe.form.details.changePhoto"]() : m["recipe.form.details.choosePhoto"]()}
        </div>
    </div>
    <p id="picture-hint" class="text-sm text-muted-foreground">{m["recipe.form.details.photoHint"]()}</p>
    <div id="picture-status" aria-live="polite" class="space-y-2">
        {#if selectedFile}
            <p class="break-all text-sm text-muted-foreground">{selectedFile.name}</p>
        {/if}
        {#if tooLarge}
            <p class="text-sm text-destructive">{m["recipe.form.details.photoTooLarge"]()}</p>
        {/if}
    </div>
    {#if selectedFile}
        <Button type="button" variant="outline" class="min-h-11 w-full" onclick={resetSelection}>
            {m["recipe.form.details.resetPhoto"]()}
        </Button>
    {/if}
</div>
