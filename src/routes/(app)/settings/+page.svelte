<script>
    import {enhance} from '$app/forms';
    import {goto, invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import Passkey from "$lib/components/settings/Passkey.svelte";
    import {toast} from "svelte-sonner";
    import {m} from "$lib/paraglide/messages";
    import {setLocale} from "$lib/paraglide/runtime.js";

    const {data} = $props();

    const user = $derived(data.user);
    const language = user.language;
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6 mt-4">
    <div class="space-y-1">
        <h1 class="font-bold text-4xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {m["nav.settings"]()}
        </h1>
        <div class="h-1 w-20 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
    </div>

    <form
            id="settings-form"
            action="?/save"
            enctype="multipart/form-data"
            method="POST"
            use:enhance={() => {
            return async ({ result }) => {
                if (result.type === 'redirect') {
                    return goto(result.location, { replaceState: true });
                }

                if (result.type === 'success') {
                    await invalidateAll();

                    if (user.language !== language) {
                        setLocale(user.language);
                    }

                    toast.success(m["settings.profile.saved"]());
                    return;
                }

                toast.error(m["settings.profile.error"]());
            }}}>

        <General {user}/>
    </form>

    <Passkey passkeys={data.passkeys}/>
</div>
