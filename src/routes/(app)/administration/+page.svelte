<script lang="ts">
    import General from "$lib/components/administration-settings/form/General.svelte";
    import {getUsers} from "$lib/functions/user.remote";
    import {getAllowRegistrations} from "$lib/functions/site.remote";
    import type {PublicUser} from "$lib/server/db/schema";

    let users = $state<PublicUser[]>([]);
    let allowRegistrations = $state(true);
    let loading = $state(true);

    $effect(() => {
        Promise.all([
            getUsers(),
            getAllowRegistrations()
        ]).then(([usersData, allowReg]) => {
            users = usersData as PublicUser[];
            allowRegistrations = allowReg;
        }).catch((err) => {
            console.error('Failed to load administration data:', err);
            users = [];
        }).finally(() => {
            loading = false;
        });
    });
</script>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <span class="text-muted-foreground">Loading…</span>
    </div>
{:else}
    <General {users} allowRegistration={allowRegistrations} />
{/if}
