<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Separator from "$lib/components/ui/separator/index.js";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import { m } from "$lib/paraglide/messages";
    import { Languages, ShieldCheck, Users } from "lucide-svelte";

    import {columns} from "../../../../routes/(app)/administration/columns";
    import DataTable from "../../../../routes/(app)/administration/data-table.svelte";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import {updateAllowRegistrations} from "$lib/functions/site.remote";
    import {toast} from "svelte-sonner";

    const { users } = $props();

    let allowRegistration = $state(true);

    async function saveSettings() {
        try {
            await updateAllowRegistrations({value: allowRegistration});

            toast.success(m["settings.profile.saved"]());
        } catch (e) {
            toast.error(m["settings.profile.error"]());
        }
    }
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>Administration</Card.Title>
        <Card.Description>Verwalte globale Einstellungen und Benutzer.</Card.Description>
    </Card.Header>
    <Card.Content>
        <Tabs.Root value="account" class="">
            <Tabs.List>
                <Tabs.Trigger value="account">General</Tabs.Trigger>
                <Tabs.Trigger value="users">Users</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="account" class="mt-4">
                <form id="admin-general" class="space-y-6" onsubmit={saveSettings}>
                    <div class="space-y-4">
                        <div class="flex items-center gap-2">
                            <ShieldCheck size={16} class="text-muted-foreground" />
                            <h3 class="text-sm font-medium">Security</h3>
                        </div>
                        <div class="flex items-center gap-3">
                            <Checkbox id="allow_registrations" bind:checked={allowRegistration} />
                            <Label for="allow_registrations">Allow registrations</Label>
                        </div>
                    </div>
                </form>
            </Tabs.Content>

            <Tabs.Content value="users" class="mt-4">
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <Users size={16} class="text-muted-foreground" />
                        <h3 class="text-sm font-medium">Users</h3>
                    </div>
                    <DataTable data={users} {columns} />
                </div>
            </Tabs.Content>
        </Tabs.Root>
    </Card.Content>
    <Card.Footer class="flex-col gap-2 items-start">
        <Button type="submit" form="admin-general">Save changes</Button>
    </Card.Footer>
</Card.Root>