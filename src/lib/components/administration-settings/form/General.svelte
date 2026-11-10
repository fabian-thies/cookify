<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { m } from "$lib/paraglide/messages";
    import { ShieldCheck, Users, Download, Upload, HardDrive, Database, FileArchive, Loader2, TriangleAlert, Sparkles } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";

    import {createColumns} from "../../../../routes/(app)/administration/columns";
    import DataTable from "../../../../routes/(app)/administration/data-table.svelte";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import {updateAiEnabled, updateAllowRegistrations} from "$lib/functions/site.remote";
    import {toast} from "svelte-sonner";
    import type {PublicUser} from "$lib/server/db/schema";

    const {
        users: initialUsers,
        allowRegistration: initialAllowRegistration = true,
        aiConfigured = false,
        aiEnabled: initialAiEnabled = true
    } = $props();

    let allowRegistration = $state(initialAllowRegistration);
    let aiEnabled = $state(initialAiEnabled);
    let isSavingSettings = $state(false);
    let users = $state<PublicUser[]>([...initialUsers]);

    // Backup state
    let isExporting = $state(false);
    let importFile = $state<File | null>(null);
    let isPreviewing = $state(false);
    let previewData = $state<Record<string, number> | null>(null);
    let previewDialogOpen = $state(false);
    let confirmDialogOpen = $state(false);
    let isImporting = $state(false);
    let previewError = $state<string | null>(null);

    const columns = createColumns({
        onUserUpdated: (updatedUser) => {
            users = users.map((user) => user.id === updatedUser.id ? {...user, ...updatedUser} : user);
        },
        onUserDeleted: (id) => {
            users = users.filter((user) => user.id !== id);
        }
    });

    async function saveSettings(e: SubmitEvent) {
        e.preventDefault();
        try {
            isSavingSettings = true;
            const updates: Promise<unknown>[] = [
                updateAllowRegistrations({value: allowRegistration})
            ];

            if (aiConfigured) {
                updates.push(updateAiEnabled({value: aiEnabled}));
            }

            await Promise.all(updates);

            toast.success(m["settings.profile.saved"]());
        } catch (error) {
            toast.error(m["settings.profile.error"]());
        } finally {
            isSavingSettings = false;
        }
    }

    async function handleExport() {
        try {
            isExporting = true;
            const res = await fetch("/administration/backup/export");
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const disposition = res.headers.get("Content-Disposition");
            const match = disposition?.match(/filename="(.+)"/);
            a.download = match?.[1] ?? "cookify-backup.zip";
            a.click();
            URL.revokeObjectURL(url);

            toast.success(m["admin.backups.export.success"]());
        } catch {
            toast.error(m["admin.backups.export.error"]());
        } finally {
            isExporting = false;
        }
    }

    async function handleFileSelected(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        importFile = file;
        previewError = null;

        try {
            isPreviewing = true;
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/administration/backup/preview", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errMsg = "Preview failed";
                try {
                    const errJson = JSON.parse(await res.text());
                    errMsg = errJson.message || errMsg;
                } catch {
                    // Not JSON, use raw text
                }
                throw new Error(errMsg);
            }

            previewData = await res.json();
            previewDialogOpen = true;
        } catch (e) {
            previewError = e instanceof Error ? e.message : "Preview failed";
            importFile = null;
        } finally {
            isPreviewing = false;
            // Reset file input so same file can be re-selected
            input.value = "";
        }
    }

    async function handleRestore() {
        if (!importFile) return;

        try {
            isImporting = true;
            const formData = new FormData();
            formData.append("file", importFile);

            const res = await fetch("/administration/backup/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errMsg = "Import failed";
                try {
                    const errJson = JSON.parse(await res.text());
                    errMsg = errJson.message || errMsg;
                } catch {
                    // Not JSON, use raw text
                }
                throw new Error(errMsg);
            }

            toast.success(m["admin.backups.import.success"]());
            previewDialogOpen = false;
            confirmDialogOpen = false;
            importFile = null;
            previewData = null;

            // Reload page to reflect restored data
            window.location.reload();
        } catch (e) {
            toast.error(m["admin.backups.import.error"]());
        } finally {
            isImporting = false;
        }
    }
</script>

<Card.Root class="w-full mt-6">
    <Card.Header>
        <Card.Title>{m["admin.title"]()}</Card.Title>
        <Card.Description>{m["admin.description"]()}</Card.Description>
    </Card.Header>
    <Card.Content>
        <Tabs.Root value="account" class="">
            <Tabs.List>
                <Tabs.Trigger value="account">{m["admin.tabs.general"]()}</Tabs.Trigger>
                <Tabs.Trigger value="users">{m["admin.tabs.users"]()}</Tabs.Trigger>
                <Tabs.Trigger value="backups">{m["admin.tabs.backups"]()}</Tabs.Trigger>
                <Tabs.Trigger value="ai">{m["admin.tabs.ai"]()}</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="account" class="mt-4">
                <form id="admin-general" class="space-y-6" onsubmit={saveSettings}>
                    <div class="space-y-4">
                        <div class="flex items-center gap-2">
                            <ShieldCheck size={16} class="text-muted-foreground" />
                            <h3 class="text-sm font-medium">{m["admin.security.title"]()}</h3>
                        </div>
                        <div class="flex items-center gap-3">
                            <Checkbox id="allow_registrations" bind:checked={allowRegistration} />
                            <Label for="allow_registrations">{m["admin.security.allowRegistrations"]()}</Label>
                        </div>
                    </div>
                </form>
            </Tabs.Content>

            <Tabs.Content value="users" class="mt-4">
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <Users size={16} class="text-muted-foreground" />
                        <h3 class="text-sm font-medium">{m["admin.users.title"]()}</h3>
                    </div>
                    <DataTable data={users} {columns} />
                </div>
            </Tabs.Content>

            <Tabs.Content value="backups" class="mt-4 space-y-8">
                <!-- Export Section -->
                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <Download size={16} class="text-muted-foreground" />
                        <h3 class="text-sm font-medium">{m["admin.backups.export.title"]()}</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">{m["admin.backups.export.description"]()}</p>
                    <Button onclick={handleExport} disabled={isExporting} class="gap-2">
                        {#if isExporting}
                            <Loader2 size={16} class="animate-spin" />
                        {/if}
                        <HardDrive size={16} />
                        {isExporting ? m["admin.backups.export.creating"]() : m["admin.backups.export.button"]()}
                    </Button>
                </div>

                <!-- Import Section -->
                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <Upload size={16} class="text-muted-foreground" />
                        <h3 class="text-sm font-medium">{m["admin.backups.import.title"]()}</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">{m["admin.backups.import.description"]()}</p>

                    <div class="flex items-center gap-3">
                        <label
                            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                            <FileArchive size={16} />
                            {importFile ? importFile.name : m["admin.backups.import.selectFile"]()}
                            <input
                                type="file"
                                accept=".zip"
                                class="hidden"
                                onchange={handleFileSelected}
                                disabled={isPreviewing}
                            />
                        </label>
                        {#if isPreviewing}
                            <Loader2 size={16} class="animate-spin text-muted-foreground" />
                        {/if}
                    </div>

                    {#if previewError}
                        <p class="text-sm text-destructive">{previewError}</p>
                    {/if}
                </div>
            </Tabs.Content>

            <Tabs.Content value="ai" class="mt-4 space-y-4">
                <div class="flex items-center gap-2">
                    <Sparkles size={16} class="text-muted-foreground"/>
                    <h3 class="text-sm font-medium">{m["admin.ai.title"]()}</h3>
                </div>
                <p class="text-sm text-muted-foreground">{m["admin.ai.description"]()}</p>
                <p class={`text-sm font-medium ${aiConfigured ? "text-emerald-600" : "text-destructive"}`}>
                    {aiConfigured ? m["admin.ai.configured"]() : m["admin.ai.notConfigured"]()}
                </p>
                <div class="flex items-center gap-3">
                    <Checkbox id="ai_enabled" bind:checked={aiEnabled} disabled={!aiConfigured}/>
                    <Label for="ai_enabled">{m["admin.ai.enable"]()}</Label>
                </div>
                <p class="text-xs text-muted-foreground">{m["admin.ai.envHint"]()}</p>
            </Tabs.Content>
        </Tabs.Root>
    </Card.Content>
    <Card.Footer class="flex-col gap-2 items-start">
        <Button type="submit" form="admin-general" disabled={isSavingSettings}>
            {isSavingSettings ? m["admin.saving"]() : m["admin.save"]()}
        </Button>
    </Card.Footer>
</Card.Root>

<!-- Preview Dialog -->
<Dialog.Root bind:open={previewDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Database size={20} />
                {m["admin.backups.import.previewTitle"]()}
            </Dialog.Title>
            <Dialog.Description>
                {m["admin.backups.import.previewDescription"]()}
            </Dialog.Description>
        </Dialog.Header>

        {#if previewData}
            <div class="grid grid-cols-2 gap-3 py-4">
                {#if previewData.users > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <Users size={14} class="text-muted-foreground" />
                        <span class="text-muted-foreground">{m["admin.backups.import.previewUsers"]()}:</span>
                        <span class="font-medium">{previewData.users}</span>
                    </div>
                {/if}
                {#if previewData.recipes > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewRecipes"]()}:</span>
                        <span class="font-medium">{previewData.recipes}</span>
                    </div>
                {/if}
                {#if previewData.ingredients > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewIngredients"]()}:</span>
                        <span class="font-medium">{previewData.ingredients}</span>
                    </div>
                {/if}
                {#if previewData.steps > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewSteps"]()}:</span>
                        <span class="font-medium">{previewData.steps}</span>
                    </div>
                {/if}
                {#if previewData.collections > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewCollections"]()}:</span>
                        <span class="font-medium">{previewData.collections}</span>
                    </div>
                {/if}
                {#if previewData.favorites > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewFavorites"]()}:</span>
                        <span class="font-medium">{previewData.favorites}</span>
                    </div>
                {/if}
                {#if previewData.ratings > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewRatings"]()}:</span>
                        <span class="font-medium">{previewData.ratings}</span>
                    </div>
                {/if}
                {#if previewData.tips > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewTips"]()}:</span>
                        <span class="font-medium">{previewData.tips}</span>
                    </div>
                {/if}
                {#if previewData.tags > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewTags"]()}:</span>
                        <span class="font-medium">{previewData.tags}</span>
                    </div>
                {/if}
                {#if previewData.difficulties > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewDifficulties"]()}:</span>
                        <span class="font-medium">{previewData.difficulties}</span>
                    </div>
                {/if}
                {#if previewData.settings > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewSettings"]()}:</span>
                        <span class="font-medium">{previewData.settings}</span>
                    </div>
                {/if}
                {#if previewData.images > 0}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-muted-foreground">{m["admin.backups.import.previewImages"]()}:</span>
                        <span class="font-medium">{previewData.images}</span>
                    </div>
                {/if}
            </div>
        {/if}

        <Dialog.Footer class="gap-2">
            <Dialog.Close>
                {#snippet child({ props })}
                    <Button {...props} variant="outline">{m["actions.cancel"]()}</Button>
                {/snippet}
            </Dialog.Close>
            <Button
                variant="destructive"
                onclick={() => {
                    previewDialogOpen = false;
                    confirmDialogOpen = true;
                }}
            >
                {m["admin.backups.import.restoreButton"]()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Confirm Dialog -->
<Dialog.Root bind:open={confirmDialogOpen}>
    <Dialog.Content class="sm:max-w-[450px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2 text-destructive">
                <TriangleAlert size={20} />
                {m["admin.backups.import.restoreButton"]()}
            </Dialog.Title>
            <Dialog.Description>
                {m["admin.backups.import.restoreWarning"]()}
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="gap-2">
            <Dialog.Close>
                {#snippet child({ props })}
                    <Button {...props} variant="outline">{m["actions.cancel"]()}</Button>
                {/snippet}
            </Dialog.Close>
            <Button
                variant="destructive"
                onclick={handleRestore}
                disabled={isImporting}
                class="gap-2"
            >
                {#if isImporting}
                    <Loader2 size={16} class="animate-spin" />
                {/if}
                {isImporting ? m["admin.backups.import.restoring"]() : m["admin.backups.import.restoreConfirm"]()}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
