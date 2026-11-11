<script lang="ts" module>
    import {cn, type WithElementRef} from "$lib/utils.js";
    import type {HTMLAnchorAttributes, HTMLButtonAttributes} from "svelte/elements";
    import {type VariantProps, tv} from "tailwind-variants";

    export const buttonVariants = tv({
        base: "focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium outline-none transition focus-visible:ring-[3px] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
                destructive:
                    "bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 text-white",
                outline:
                    "bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground border border-border dark:bg-input/20 dark:hover:bg-input/40",
                secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/70",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
                sm: "h-9 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
                lg: "h-12 rounded-xl px-7 has-[>svg]:px-5",
                icon: "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    });

    export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
    export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

    export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
        WithElementRef<HTMLAnchorAttributes> & {
        variant?: ButtonVariant;
        size?: ButtonSize;
    };
</script>

<script lang="ts">
    let {
        class: className,
        variant = "default",
        size = "default",
        ref = $bindable(null),
        href = undefined,
        type = "button",
        disabled,
        children,
        ...restProps
    }: ButtonProps = $props();
</script>

{#if href}
    <a
            bind:this={ref}
            data-slot="button"
            class={cn(buttonVariants({ variant, size }), className)}
            href={disabled ? undefined : href}
            aria-disabled={disabled}
            role={disabled ? "link" : undefined}
            tabindex={disabled ? -1 : undefined}
            {...restProps}
    >
        {@render children?.()}
    </a>
{:else}
    <button
            bind:this={ref}
            data-slot="button"
            class={cn(buttonVariants({ variant, size }), className)}
            {type}
            {disabled}
            {...restProps}
    >
        {@render children?.()}
    </button>
{/if}
