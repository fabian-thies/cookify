<script lang="ts">
    import DataTable from "./data-table.svelte";
    import { columns } from "./columns.js";
    import General from "$lib/components/administration-settings/form/General.svelte";
    const { data } = $props();

    const users = data.users;
</script>

<General users={users} />