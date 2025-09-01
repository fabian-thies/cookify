<script lang="ts">
	import '../app.css';
    import NavBar from "$lib/components/NavBar.svelte";
    import {Search} from "lucide-svelte";
    import {Input} from "$lib/components/ui/input";
	
	let { children } = $props();
</script>

<NavBar/>

<div class="container mx-auto p-2">
    {@render children()}
</div>
