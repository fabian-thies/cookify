<script lang="ts">
    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<nav class="bg-white shadow-xs border-b border-gray-200 h-18 w-screen flex items-center justify-around px-8">
    <a href="/">
        <h1 class="text-2xl font-bold text-foreground">cookify</h1>
    </a>
    {#if isOpen}
    {/if}
</nav>