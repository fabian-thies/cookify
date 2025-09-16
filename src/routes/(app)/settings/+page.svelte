<script>
    import {enhance} from '$app/forms';
    import {invalidateAll} from '$app/navigation';
    import General from "$lib/components/settings/form/General.svelte";
    import {toast} from "svelte-sonner";
    import {onMount} from "svelte";
    const { data } = $props();

    const user = data.user;
</script>
<form
        action="?/save"
        method="POST"
        enctype="multipart/form-data"
        use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success') {
                await invalidateAll();

                toast.success("Successfully saved");
            }
        }}}>

    <General {user}/>
</form>