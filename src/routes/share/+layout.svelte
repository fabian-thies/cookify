<script>
    let {children} = $props();
</script>

<div class="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:px-6">
    <header class="mb-4 flex justify-center py-2">
        <a class="cookify text-xl font-semibold tracking-tight transition hover:opacity-80" href="/">cookify</a>
    </header>
    {@render children()}
</div>
