<script lang="ts">
    import {Select as SelectPrimitive} from "bits-ui";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import {cn, type WithoutChild} from "$lib/utils.js";

    let {
        ref = $bindable(null),
        class: className,
        children,
        size = "default",
        ...restProps
    }: WithoutChild<SelectPrimitive.TriggerProps> & {
        size?: "sm" | "default";
    } = $props();
</script>

<SelectPrimitive.Trigger
        {...restProps}
        bind:ref
        class={cn(
		"border-border data-[placeholder]:text-muted-foreground/70 [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/20 dark:hover:bg-input/35 flex w-fit select-none items-center justify-between gap-2 whitespace-nowrap rounded-lg border bg-transparent px-3 py-2 text-base outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-10 data-[size=sm]:h-9 md:text-sm *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
        data-size={size}
        data-slot="select-trigger"
>
    {@render children?.()}
    <ChevronDownIcon class="size-4 opacity-50"/>
</SelectPrimitive.Trigger>
