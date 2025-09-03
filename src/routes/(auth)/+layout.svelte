<script lang="ts">
	import '../../app.css';
	let { children } = $props();
</script>

<div class="container mx-auto p-2">
    {@render children()}
</div>
