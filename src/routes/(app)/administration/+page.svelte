<script lang="ts">
    import DataTable from "./data-table.svelte";
    import { columns } from "./columns.js";
    const { data } = $props();

    const users = data.users;
</script>

<DataTable data={users} {columns}/>