<script lang="ts">
	import '../../app.css';
    import NavBar from "$lib/components/NavBar.svelte";

	let { children } = $props();
</script>

<NavBar/>

<div class="container mx-auto p-2">
    {@render children()}
</div>
