<script lang="ts">
    import {onMount} from 'svelte';
    import {page} from '$app/state';
    import {toast} from 'svelte-sonner';
    import {Download, X} from 'lucide-svelte';
    import {Button} from '$lib/components/ui/button';
    import {m} from '$lib/paraglide/messages';
    import {isStandalone} from '$lib/pwa';

    interface BeforeInstallPromptEvent extends Event {
        prompt(): Promise<void>;
        userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
    }

    const DISMISS_KEY = 'cookify-install-dismissed-at';
    const DISMISS_DAYS = 30;

    let promptEvent = $state<BeforeInstallPromptEvent | null>(null);
    let visible = $state(false);
    let installed = $state(false);
    const cooking = $derived(/^\/recipe\/\d+\/cook$/.test(page.url.pathname));

    function wasRecentlyDismissed(): boolean {
        try {
            const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
            return Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000;
        } catch {
            return false;
        }
    }

    function rememberDismissal(): void {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            // Storage can be unavailable in private/blocked contexts.
        }
    }

    onMount(() => {
        installed = isStandalone();
        if (installed) return;

        const onBeforeInstall = (event: Event) => {
            event.preventDefault();
            promptEvent = event as BeforeInstallPromptEvent;
            visible = !wasRecentlyDismissed();
        };

        const onInstalled = () => {
            installed = true;
            visible = false;
            promptEvent = null;
            try {
                localStorage.removeItem(DISMISS_KEY);
            } catch {
                // Ignore storage errors.
            }
            toast.success(m['pwa.installed']());
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    });

    async function install(): Promise<void> {
        if (!promptEvent) return;

        const event = promptEvent;
        promptEvent = null;
        visible = false;

        await event.prompt();
        const choice = await event.userChoice;

        if (choice.outcome !== 'accepted') {
            rememberDismissal();
        }
    }

    function dismiss(): void {
        visible = false;
        rememberDismissal();
    }
</script>

{#if visible && !installed && !cooking}
    <aside
            aria-label={m['pwa.installTitle']()}
            class="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur-xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-80"
            role="region"
    >
        <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Download class="size-5"/>
            </div>
            <div class="min-w-0 flex-1">
                <p class="font-semibold leading-tight">{m['pwa.installTitle']()}</p>
                <p class="mt-1 text-sm text-muted-foreground">{m['pwa.installText']()}</p>
            </div>
            <button
                    aria-label={m['actions.close']()}
                    class="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    onclick={dismiss}
                    type="button"
            >
                <X class="size-4"/>
            </button>
        </div>
        <div class="mt-3 flex justify-end">
            <Button class="w-full sm:w-auto" onclick={install} size="sm">
                <Download class="size-4"/>
                {m['pwa.install']()}
            </Button>
        </div>
    </aside>
{/if}
