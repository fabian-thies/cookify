<script lang="ts">
    import General from "$lib/components/administration-settings/form/General.svelte";
    const { data } = $props();

    const users = data.users;
    const allowRegistrations = data.allowRegistrations ?? true;
</script>

<General {users} allowRegistration={allowRegistrations} />
