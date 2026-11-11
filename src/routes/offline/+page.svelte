<script lang="ts">
    import {WifiOff} from 'lucide-svelte';
    import {Button} from '$lib/components/ui/button';
    import {m} from '$lib/paraglide/messages';
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-12 text-center">
    <div class="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <WifiOff class="size-7"/>
    </div>
    <div class="max-w-sm space-y-2">
        <h1 class="page-title">{m['offline.title']()}</h1>
        <p class="text-muted-foreground">{m['offline.text']()}</p>
    </div>
    <Button href="/">{m['offline.retry']()}</Button>
</div>
