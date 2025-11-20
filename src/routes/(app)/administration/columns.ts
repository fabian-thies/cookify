import type { ColumnDef } from "@tanstack/table-core";
import type {PublicUser, User} from "$lib/server/db/schema";
import {renderComponent} from "$lib/components/ui/data-table";
import DataTableActions from "./data-table-actions.svelte";

export const columns: ColumnDef<PublicUser>[] = [
    {
        accessorKey: "id",
        header: "ID",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "username",
        header: "Username",
    },
    {
        accessorKey: "administrator",
        header: "Administrator",
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({row}) => {
            return renderComponent(DataTableActions, {id: row.original.id});
        },
    },
];