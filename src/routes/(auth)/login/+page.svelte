<script lang="ts">
    import ErrorState from "$lib/components/ErrorState.svelte";
    import {Toaster} from "$lib/components/ui/sonner";
    import LoginForm from "$lib/components/LoginForm.svelte";
    import {ChefHat} from 'lucide-svelte';
    import {getAllowRegistrations} from "$lib/functions/site.remote";

    let allowRegistrations = $state(false);
    let failed = $state(false);

    async function loadSettings() {
        failed = false;
        try {
            allowRegistrations = await getAllowRegistrations().run();
        } catch {
            failed = true;
        }
    }

    $effect(() => { queueMicrotask(loadSettings); });
</script>

<Toaster position="top-center" richColors/>

<div class="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
    <a class="flex flex-col items-center gap-3" href="/">
        <div class="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/20">
            <ChefHat class="size-6"/>
        </div>
        <span class="cookify text-2xl font-semibold tracking-tight">cookify</span>
    </a>
    <div class="flex w-full max-w-sm flex-col gap-6">
        {#if failed}
            <ErrorState onRetry={loadSettings}/>
        {/if}
        <LoginForm isLogin={true} {allowRegistrations}/>
    </div>
</div>
