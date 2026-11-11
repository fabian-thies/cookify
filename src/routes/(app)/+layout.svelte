<script lang="ts">
    import '../../app.css';
    import {page} from "$app/state";
    import NavBar from "$lib/components/NavBar.svelte";
    import MobileNav from "$lib/components/MobileNav.svelte";
    import {Toaster} from "$lib/components/ui/sonner/index.js";
    import {m} from "$lib/paraglide/messages";

    let {children, data} = $props();

    const user = $derived(data.user);
    const cooking = $derived(/^\/recipe\/\d+\/cook$/.test(page.url.pathname));
</script>

{#if !cooking}<NavBar {user}/>{/if}

<Toaster offset={84} position="top-center" richColors/>

<a class="skip-link" href="#main-content">{m["a11y.skipToContent"]()}</a>
<main id="main-content" tabindex="-1" class="mx-auto w-full max-w-7xl px-4 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12">
    {@render children()}
</main>

{#if !cooking}<MobileNav/>{/if}
