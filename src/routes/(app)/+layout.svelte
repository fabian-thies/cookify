<script lang="ts">
    import '../../app.css';
    import NavBar from "$lib/components/NavBar.svelte";
    import {Toaster} from "$lib/components/ui/sonner/index.js";

    let {children, data} = $props();

    const user = $derived(data.user);
</script>

<NavBar {user}/>

<Toaster position="top-center" richColors/>

<div class="container mx-auto max-w-6xl px-3 sm:px-5 pb-12 pt-4">
    {@render children()}
</div>
