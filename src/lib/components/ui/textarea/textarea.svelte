<script lang="ts">
    import {cn, type WithElementRef, type WithoutChildren} from "$lib/utils.js";
    import type {HTMLTextareaAttributes} from "svelte/elements";

    let {
        ref = $bindable(null),
        value = $bindable(),
        class: className,
        ...restProps
    }: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
        {...restProps}
        bind:this={ref}
        bind:value
        class={cn(
		"border-input placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/20 field-sizing-content flex min-h-20 w-full rounded-lg border bg-transparent px-3 py-2.5 text-base outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
		className
	)}
        data-slot="textarea"
></textarea>
