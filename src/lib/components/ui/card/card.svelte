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
        class={cn(
		"bg-card text-card-foreground flex flex-col gap-4 rounded-xl border border-border/70 py-4 shadow-xs sm:gap-6 sm:py-6",
		className
	)}
        data-slot="card"
>
    {@render children?.()}
</div>
