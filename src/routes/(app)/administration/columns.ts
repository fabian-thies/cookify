import type { ColumnDef } from "@tanstack/table-core";
import type {PublicUser} from "$lib/server/db/schema";
import {renderComponent} from "$lib/components/ui/data-table";
import DataTableActions from "./data-table-actions.svelte";

export type UserTableHandlers = {
    onUserUpdated?: (user: PublicUser) => void;
    onUserDeleted?: (id: string) => void;
};

export const createColumns = (handlers: UserTableHandlers = {}): ColumnDef<PublicUser>[] => [
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
        cell: ({row}) => row.original.administrator ? "Yes" : "No",
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({row}) => {
            return renderComponent(DataTableActions, {
                user: row.original,
                onUserUpdated: handlers.onUserUpdated,
                onUserDeleted: handlers.onUserDeleted,
            });
        },
    },
];
