<script lang="ts">
    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<nav class="bg-background shadow-xs h-18 w-full flex items-center justify-around px-8">
    <a href="/">
        <h1 class="text-2xl font-bold text-foreground">cookify</h1>
    </a>
    {#if isOpen}
    {/if}
</nav>