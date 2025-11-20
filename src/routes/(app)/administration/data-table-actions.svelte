<script lang="ts">
    import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import KeyIcon from "@lucide/svelte/icons/key-round";
    import MailIcon from "@lucide/svelte/icons/mail";
    import LoaderIcon from "@lucide/svelte/icons/loader-2";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import {toast} from "svelte-sonner";
    import {setUserEmail, setUserPassword, removeUser} from "$lib/functions/user.remote";
    import type {PublicUser} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages";

    type Props = {
        user: PublicUser;
        onUserUpdated?: (user: PublicUser) => void;
        onUserDeleted?: (id: string) => void;
    };

    let {user, onUserUpdated, onUserDeleted}: Props = $props();

    let emailDialogOpen = $state(false);
    let passwordDialogOpen = $state(false);
    let deleteDialogOpen = $state(false);
    let email = $state(user.email);
    let password = $state("");
    let isUpdatingEmail = $state(false);
    let isUpdatingPassword = $state(false);
    let isDeletingUser = $state(false);

    $effect(() => {
        email = user.email;
    });

    async function saveEmail() {
        if (!email) return;

        try {
            isUpdatingEmail = true;
            await setUserEmail({userId: user.id, email});
            onUserUpdated?.({...user, email});
            toast.success(m["admin.users.actions.emailUpdated"]());
            emailDialogOpen = false;
        } catch (e) {
            const message = e instanceof Error ? e.message : m["admin.users.actions.errorEmail"]();
            toast.error(message);
        } finally {
            isUpdatingEmail = false;
        }
    }

    async function savePassword() {
        if (!password) return;

        try {
            isUpdatingPassword = true;
            await setUserPassword({userId: user.id, password});
            toast.success(m["admin.users.actions.passwordUpdated"]());
            password = "";
            passwordDialogOpen = false;
        } catch (e) {
            const message = e instanceof Error ? e.message : m["admin.users.actions.errorPassword"]();
            toast.error(message);
        } finally {
            isUpdatingPassword = false;
        }
    }

    async function deleteUser() {
        try {
            isDeletingUser = true;
            await removeUser({userId: user.id});
            onUserDeleted?.(user.id);
            toast.success(m["admin.users.actions.userDeleted"]());
            deleteDialogOpen = false;
        } catch (e) {
            const message = e instanceof Error ? e.message : m["admin.users.actions.errorDelete"]();
            toast.error(message);
        } finally {
            isDeletingUser = false;
        }
    }
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        {#snippet child({ props })}
            <Button
                    {...props}
                    variant="ghost"
                    size="icon"
                    class="relative size-8 p-0"
            >
                <span class="sr-only">Open menu</span>
                <EllipsisIcon />
            </Button>
        {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
        <DropdownMenu.Group>
            <DropdownMenu.Label>{m["admin.users.actions.label"]()}</DropdownMenu.Label>
            <DropdownMenu.Item onclick={() => emailDialogOpen = true}>
                {m["admin.users.actions.editEmail"]()}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => passwordDialogOpen = true}>
                {m["admin.users.actions.editPassword"]()}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => deleteDialogOpen = true}>
                {m["admin.users.actions.deleteUser"]()}
            </DropdownMenu.Item>
        </DropdownMenu.Group>
    </DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={emailDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <MailIcon class="size-4" /> {m["admin.users.actions.editEmail"]()}
            </Dialog.Title>
            <Dialog.Description>
                {m["admin.users.actions.emailDescription"]({username: user.username})}
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-2">
            <Label for="email-{user.id}">{m["login.email"]()}</Label>
            <Input id="email-{user.id}" type="email" bind:value={email} />
        </div>
        <Dialog.Footer class="gap-2">
            <Dialog.Close asChild>
                <Button variant="outline" type="button">{m["actions.cancel"]()}</Button>
            </Dialog.Close>
            <Button type="button" onclick={saveEmail} disabled={isUpdatingEmail} class="gap-2">
                {#if isUpdatingEmail}
                    <LoaderIcon class="size-4 animate-spin" />
                {/if}
                {m["admin.users.actions.saveEmail"]()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={passwordDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <KeyIcon class="size-4" /> {m["admin.users.actions.editPassword"]()}
            </Dialog.Title>
            <Dialog.Description>
                {m["admin.users.actions.passwordDescription"]({username: user.username})}
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-2">
            <Label for="password-{user.id}">{m["login.password"]()}</Label>
            <Input
                    id="password-{user.id}"
                    type="password"
                    placeholder={m["admin.users.actions.passwordPlaceholder"]()}
                    bind:value={password}
            />
        </div>
        <Dialog.Footer class="gap-2">
            <Dialog.Close asChild>
                <Button variant="outline" type="button">{m["actions.cancel"]()}</Button>
            </Dialog.Close>
            <Button type="button" onclick={savePassword} disabled={isUpdatingPassword} class="gap-2">
                {#if isUpdatingPassword}
                    <LoaderIcon class="size-4 animate-spin" />
                {/if}
                {m["admin.users.actions.savePassword"]()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2 text-destructive">
                <TrashIcon class="size-4" />
                {m["admin.users.actions.deleteUser"]()}
            </Dialog.Title>
            <Dialog.Description>
                {m["admin.users.actions.deleteDescription"]({username: user.username})}
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="gap-2">
            <Dialog.Close asChild>
                <Button variant="outline" type="button">{m["actions.cancel"]()}</Button>
            </Dialog.Close>
            <Button variant="destructive" type="button" onclick={deleteUser} disabled={isDeletingUser} class="gap-2">
                {#if isDeletingUser}
                    <LoaderIcon class="size-4 animate-spin" />
                {/if}
                {m["actions.delete"]()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
