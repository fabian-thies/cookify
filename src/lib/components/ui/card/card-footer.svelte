<script lang="ts">
    import {cn, type WithElementRef} from "$lib/utils.js";
    import type {HTMLAttributes} from "svelte/elements";

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
        class={cn("[.border-t]:pt-6 flex items-center px-6", className)}
        data-slot="card-footer"
>
    {@render children?.()}
</div>
