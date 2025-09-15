<script>
    import {enhance} from '$app/forms';
    import {invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import {toast} from "svelte-sonner";

    const { data } = $props();

    const user = data.user;
</script>
<form
        action="?/save"
        method="POST"
        use:enhance={() => {
        return async ({ result }) => {
                toast.success("Settings saved");

            if (result.type === 'success') {
                await invalidateAll();

                toast.success("Settings saved");
            }
        };
    }}
>
    <General {user}/>
</form>