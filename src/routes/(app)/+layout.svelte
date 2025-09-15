<script lang="ts">
	import '../../app.css';
    import NavBar from "$lib/components/NavBar.svelte";

	let { children, data } = $props();

    const user = data.user;
</script>

<NavBar {user}/>

<div class="container mx-auto p-2">
    {@render children()}
</div>
