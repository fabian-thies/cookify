<script>
    import Nav from "$lib/components/Nav.svelte";

    let {data, children} = $props();
</script>

<Nav/>

{@render children()}
