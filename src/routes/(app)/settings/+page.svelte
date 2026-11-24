<script>
    import {enhance} from '$app/forms';
    import {goto, invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import CookbookExport from "$lib/components/settings/CookbookExport.svelte";
    import Passkey from "$lib/components/settings/Passkey.svelte";
    import {toast} from "svelte-sonner";
    import {m} from "$lib/paraglide/messages";
    import {setLocale} from "$lib/paraglide/runtime.js";

    const {data} = $props();

    const user = $derived(data.user);
    let passwordResetKey = $state(0);
</script>

<div class="mt-2 flex flex-col gap-5">
    <h1 class="page-title">{m["nav.settings"]()}</h1>

    <form
            id="settings-form"
            action="?/save"
            enctype="multipart/form-data"
            method="POST"
            use:enhance={() => {
            const previousLanguage = user.language;
            return async ({ result }) => {
                if (result.type === 'redirect') {
                    return goto(result.location, { replaceState: true });
                }

                if (result.type === 'success') {
                    await invalidateAll();
                    passwordResetKey += 1;

                    if (user.language !== previousLanguage) {
                        setLocale(user.language);
                    }

                    toast.success(m["settings.profile.saved"]());
                    return;
                }

                if (result.type === 'failure') {
                    if (result.data?.currentPasswordRequired) {
                        toast.error(m["settings.profile.currentPasswordRequired"]());
                        return;
                    }
                    if (result.data?.currentPasswordInvalid) {
                        toast.error(m["settings.profile.currentPasswordInvalid"]());
                        return;
                    }
                }

                toast.error(m["settings.profile.error"]());
            }}}>

        <General {user} {passwordResetKey}/>
    </form>

    <CookbookExport/>

    <Passkey passkeys={data.passkeys}/>
</div>
