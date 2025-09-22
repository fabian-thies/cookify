<script>
    import {enhance} from '$app/forms';
    import {invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import {toast} from "svelte-sonner";
    import { m } from "$lib/paraglide/messages";
    import {setLocale} from "$lib/paraglide/runtime.js";
    const { data } = $props();

    const user = $derived(data.user);
    const language = user.language;
</script>
<form
        action="?/save"
        method="POST"
        enctype="multipart/form-data"
        use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success') {
                await invalidateAll();

                if(user.language !== language) {
                    setLocale(user.language);
                }

                toast.success(m["settings.profile.saved"]());
            } else {
                toast.error(m["settings.profile.error"]());
            }
        }}}>

    <General {user}/>
</form>