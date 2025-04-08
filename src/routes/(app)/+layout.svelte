<script>
    let {children} = $props();
</script>

<nav class="navbar bg-base-100 container mx-auto py-6">
    <div class="flex-1">
        <a class="text-2xl font-bold" href="/">cookify</a>
    </div>
    <div class="flex-none">
        <button class="cursor-pointer" aria-label="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                 class="inline-block h-7 w-7 stroke-current">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </button>
    </div>
</nav>

{@render children()}
