<script lang="ts">
    import '../app.css';
    import {onMount} from 'svelte';
    import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
    import {registerServiceWorker} from '$lib/pwa';

    let {children} = $props();

    onMount(registerServiceWorker);
</script>

{@render children()}
<InstallPrompt/>
