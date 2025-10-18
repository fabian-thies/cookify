<script lang="ts">
    import '../../app.css';
    import NavBar from "$lib/components/NavBar.svelte";
    import {Toaster} from "$lib/components/ui/sonner/index.js";

    let {children, data} = $props();

    const user = $derived(data.user);
</script>

<NavBar {user}/>

<Toaster position="top-center" richColors/>

<div class="container mx-auto p-2">
    {@render children()}
</div>
