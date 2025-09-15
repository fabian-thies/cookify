<script>
    import General from "$lib/components/settings/form/General.svelte";

    const { data } = $props();

    const user = data.user;
</script>

<General {user} />