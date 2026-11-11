<script lang="ts">
    import ErrorState from "$lib/components/ErrorState.svelte";
    import General from "$lib/components/administration-settings/form/General.svelte";
    import {getUsers} from "$lib/functions/user.remote";
    import {getAllowRegistrations} from "$lib/functions/site.remote";
    import type {PublicUser} from "$lib/server/db/schema";

    const {data} = $props();

    let users = $state<PublicUser[]>([]);
    let allowRegistrations = $state(true);
    let loading = $state(true);
    let failed = $state(false);

    function loadAdministration() {
        loading = true;
        failed = false;
        Promise.all([
            getUsers().run(),
            getAllowRegistrations().run()
        ]).then(([usersData, allowReg]) => {
            users = usersData as PublicUser[];
            allowRegistrations = allowReg;
        }).catch((err) => {
            console.error('Failed to load administration data:', err);
            failed = true;
        }).finally(() => {
            loading = false;
        });
    }

    $effect(() => { queueMicrotask(loadAdministration); });
</script>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <span class="text-muted-foreground">Loading…</span>
    </div>
{:else if failed}
    <ErrorState onRetry={loadAdministration}/>
{:else}
    <General
        {users}
        allowRegistration={allowRegistrations}
        aiConfigured={data.ai.configured}
        aiEnabled={data.ai.enabled}
    />
{/if}
