<script lang="ts">
    import type {HTMLAttributes} from "svelte/elements";
    import {cn, type WithElementRef} from "$lib/utils.js";

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...restProps
    }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
        {...restProps}
        bind:this={ref}
        class={cn("flex flex-col gap-2 px-6 text-center sm:pl-0 sm:pr-8 sm:text-left", className)}
        data-slot="dialog-header"
>
    {@render children?.()}
</div>
