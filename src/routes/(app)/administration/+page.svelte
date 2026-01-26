<script lang="ts">
    import General from "$lib/components/administration-settings/form/General.svelte";
    import {getUsers} from "$lib/functions/user.remote";
    import {getAllowRegistrations} from "$lib/functions/site.remote";

    let users = $state([]);
    let allowRegistrations = $state(true);

    $effect(() => {
        Promise.all([
            getUsers(),
            getAllowRegistrations()
        ]).then(([usersData, allowReg]) => {
            users = usersData;
            allowRegistrations = allowReg;
        });
    });
</script>

<General {users} allowRegistration={allowRegistrations} />
