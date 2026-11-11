<script lang="ts">
    import {Dialog as DialogPrimitive} from "bits-ui";
    import XIcon from "@lucide/svelte/icons/x";
    import type {Snippet} from "svelte";
    import * as Dialog from "./index.js";
    import {cn, type WithoutChildrenOrChild} from "$lib/utils.js";

    let {
        ref = $bindable(null),
        class: className,
        portalProps,
        children,
        showCloseButton = true,
        ...restProps
    }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
        portalProps?: DialogPrimitive.PortalProps;
        children: Snippet;
        showCloseButton?: boolean;
    } = $props();
</script>

<Dialog.Portal {...portalProps}>
    <Dialog.Overlay/>
    <DialogPrimitive.Content
            {...restProps}
            bind:ref
            class={cn(
		"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border bg-card p-6 shadow-xl duration-200 sm:max-w-lg max-sm:data-[state=open]:slide-in-from-bottom-4 max-sm:data-[state=closed]:slide-out-to-bottom-4 max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-b-0 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
			className
		)}
            data-slot="dialog-content"
    >
        {@render children?.()}
        {#if showCloseButton}
            <DialogPrimitive.Close
                    class="ring-offset-background focus:ring-ring absolute end-3 top-3 flex size-9 items-center justify-center rounded-lg text-muted-foreground opacity-80 transition hover:bg-accent hover:text-foreground hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
            >
                <XIcon/>
                <span class="sr-only">Close</span>
            </DialogPrimitive.Close>
        {/if}
    </DialogPrimitive.Content>
</Dialog.Portal>
