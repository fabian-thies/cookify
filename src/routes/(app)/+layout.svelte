<script>
    import Nav from "$lib/components/Nav.svelte";
    import {page} from '$app/state';

    let {data, children} = $props();
</script>

<Nav/>

{@render children()}
