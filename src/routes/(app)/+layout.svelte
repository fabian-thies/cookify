<script lang="ts">
    import Nav from "$lib/components/Nav/Nav.svelte";

    const {children} = $props();
</script>

<Nav></Nav>

{@render children?.()}