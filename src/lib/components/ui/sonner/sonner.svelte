<script lang="ts">
    import {Toaster as Sonner, type ToasterProps as SonnerProps} from "svelte-sonner";
    import {mode} from "mode-watcher";

    let {...restProps}: SonnerProps = $props();
</script>

<Sonner
        {...restProps}
        class="toaster group"
        style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
        theme={mode.current}
/>
