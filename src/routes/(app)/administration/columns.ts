import type { ColumnDef } from "@tanstack/table-core";
import type {PublicUser, User} from "$lib/server/db/schema";

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
    }
];