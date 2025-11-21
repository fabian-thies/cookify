<script>
    import {enhance} from '$app/forms';
    import {goto, invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import {toast} from "svelte-sonner";
    import {m} from "$lib/paraglide/messages";
    import {setLocale} from "$lib/paraglide/runtime.js";

    const {data} = $props();

    const user = $derived(data.user);
    const language = user.language;
</script>
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
