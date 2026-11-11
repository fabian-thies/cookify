<script lang="ts">
    import '../../app.css';
    import NavBar from "$lib/components/NavBar.svelte";
    import MobileNav from "$lib/components/MobileNav.svelte";
    import {Toaster} from "$lib/components/ui/sonner/index.js";

    let {children, data} = $props();

    const user = $derived(data.user);
</script>

<NavBar {user}/>

<Toaster offset={84} position="top-center" richColors/>

<div class="mx-auto w-full max-w-7xl px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12">
    {@render children()}
</div>

<MobileNav/>