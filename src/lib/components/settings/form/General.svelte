<script lang="ts">
    import {untrack} from "svelte";
    import {enhance} from "$app/forms";
    import {goto} from "$app/navigation";
    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {m} from "$lib/paraglide/messages";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Separator from "$lib/components/ui/separator/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import type {PublicUser} from "$lib/server/db/schema";
    import {Camera, Eye, EyeOff, Languages, Lock, Trash2} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";
    import {imageVariantUrl} from "$lib/images";
    import {MIN_PASSWORD_LENGTH} from "$lib/utils";
    import {toast} from "svelte-sonner";

    const {user, passwordResetKey = 0}: { user: PublicUser, passwordResetKey?: number } = $props();

    let fileInput: HTMLInputElement;
    let selectedFile = $state<File | null>(null);
    let showCurrentPassword = $state(false);
    let showPassword = $state(false);
    let showPasswordConfirm = $state(false);
    let showDeletePassword = $state(false);

    let previewUrl = $state<string | null>(null);
    $effect(() => {
        const url = selectedFile ? URL.createObjectURL(selectedFile) : null;
        previewUrl = url;
        return () => { if (url) URL.revokeObjectURL(url); };
    });

    function handleAvatarChange(event: Event) {
        const files = (event.target as HTMLInputElement).files;
        selectedFile = files?.[0] ?? null;
    }

    function openAvatarPicker() {
        fileInput?.click();
    }

    let email = $state(untrack(() => user.email));
    $effect(() => {
        email = user.email;
    });

    let currentPassword = $state('');
    let password = $state('');
    let passwordConfirm = $state('');

    $effect(() => {
        if (passwordResetKey > 0) {
            currentPassword = '';
            password = '';
            passwordConfirm = '';
            showCurrentPassword = false;
            showPassword = false;
            showPasswordConfirm = false;
        }
    });

    let isChangingEmail = $derived(email !== user.email);
    let isChangingPassword = $derived(password.length > 0);
    let requiresCurrentPassword = $derived(isChangingEmail || isChangingPassword);

    let passwordsMatch = $derived(password === passwordConfirm && password.length > 0);
    let passwordStrength = $derived(() => {
        if (password.length === 0) return 'none';
        if (password.length < MIN_PASSWORD_LENGTH) return 'weak';
        if (password.length < 14) return 'medium';
        return 'strong';
    });

    let selectedLanguage = $state(untrack(() => user.language || 'en'));
    $effect(() => {
        selectedLanguage = user.language || 'en';
    });

    let confirmDeleteOpen = $state(false);
    let deleteConfirmInput = $state('');
    let deletePassword = $state('');
    let canDelete = $derived(deleteConfirmInput === user.username && deletePassword.length > 0);

    $effect(() => {
        if (!confirmDeleteOpen) {
            deleteConfirmInput = '';
            deletePassword = '';
            showDeletePassword = false;
        }
    });

    // TODO: Combine with db schema enum
    const languageOptions = [
        {value: 'en', label: m['settings.profile.languages.en']()},
        {value: 'de', label: m['settings.profile.languages.de']()},
        {value: 'es', label: m['settings.profile.languages.es']()}
    ];
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>{m["settings.profile.title"]()}</Card.Title>
        <Card.Description>{m["settings.profile.description"]()}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-4">
                <button aria-controls="avatar"
                        aria-label={m["settings.profile.changeAvatar"]()}
                        class="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background" onclick={openAvatarPicker}
                        type="button">
                        <Avatar.Root class="cursor-pointer size-16 sm:size-20">
                            <Avatar.Image decoding="async" loading="lazy" src={previewUrl ?? imageVariantUrl(user.avatar, "thumb")}/>
                            <Avatar.Fallback class="text-lg">{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
                        </Avatar.Root>
                </button>
                <input accept="image/*" bind:this={fileInput} class="sr-only" id="avatar" name="avatar" onchange={handleAvatarChange}
                       type="file"/>
                <Button aria-controls="avatar" class="flex items-center gap-2" onclick={openAvatarPicker} type="button"
                        variant="outline">
                    <Camera size={16}/>
                    {m["settings.profile.changeAvatar"]()}
                </Button>
            </div>

            <div class="flex w-full flex-col gap-1.5">
                <Label for="username">{m["settings.profile.username"]()}</Label>
                <Input autocapitalize="none" id="username" maxlength={31} minlength={3} name="username"
                       pattern="[a-zA-Z0-9_-]+" placeholder={m["settings.profile.usernamePlaceholder"]()}
                       required spellcheck={false} type="text" value={user.username}/>
            </div>

            <div class="flex w-full flex-col gap-1.5">
                <Label for="email">{m["settings.profile.email"]()}</Label>
                <Input bind:value={email} id="email" name="email" placeholder={m["settings.profile.emailPlaceholder"]()} required
                       type="email"/>
            </div>

            <Separator.Root class="my-2"/>

            <div class="space-y-4">
                <div class="flex items-center gap-2 mb-4">
                    <Languages class="text-muted-foreground" size={16}/>
                    <h3 class="text-sm font-medium">{m["settings.profile.language"]()}</h3>
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="flex w-full flex-col gap-1.5">
                        <Label for="language">{m["settings.profile.selectLanguage"]()}</Label>
                        <SelectComponent
                                bind:value={selectedLanguage}
                                name="language"
                                options={languageOptions}
                                placeholder={m["settings.profile.selectLanguage"]()}
                        />
                    </div>
                </div>
            </div>

            <Separator.Root class="my-2"/>

            <div class="space-y-4">
                <div class="flex items-center gap-2 mb-4">
                    <Lock class="text-muted-foreground" size={16}/>
                    <h3 class="text-sm font-medium">{m["settings.profile.changePassword"]()}</h3>
                </div>
                <div class="flex w-full flex-col gap-1.5">
                    <Label class="flex items-center gap-1" for="currentPassword">
                        {m["settings.profile.currentPassword"]()}
                        {#if requiresCurrentPassword}
                            <span aria-hidden="true" class="text-destructive">*</span>
                        {/if}
                    </Label>
                    <div class="relative md:max-w-[calc(50%-0.5rem)]">
                        <Input
                                autocomplete="current-password"
                                bind:value={currentPassword}
                                class="pr-10 {requiresCurrentPassword && currentPassword.length === 0 ? 'border-amber-500/70' : ''}"
                                id="currentPassword"
                                name="currentPassword"
                                placeholder={m["settings.profile.currentPasswordPlaceholder"]()}
                                required={requiresCurrentPassword}
                                type={showCurrentPassword ? "text" : "password"}
                        />
                        <Button aria-label={showCurrentPassword ? m["login.hidePassword"]() : m["login.showPassword"]()} aria-pressed={showCurrentPassword} class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onclick={() => showCurrentPassword = !showCurrentPassword} size="sm"
                                type="button"
                                variant="ghost">
                            {#if showCurrentPassword}
                                <EyeOff size={16} class="text-muted-foreground"/>
                            {:else}
                                <Eye size={16} class="text-muted-foreground"/>
                            {/if}
                        </Button>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        {m["settings.profile.currentPasswordHint"]()}
                    </p>
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="flex w-full flex-col gap-1.5">
                        <Label for="password">{m["settings.profile.newPassword"]()}</Label>
                        <div class="relative">
                            <Input
                                    bind:value={password}
                                    class="pr-10"
                                    id="password"
                                    autocomplete="new-password"
                                    maxlength={255}
                                    minlength={MIN_PASSWORD_LENGTH}
                                    name="password"
                                    placeholder={m["settings.profile.newPasswordPlaceholder"]()}
                                    type={showPassword ? "text" : "password"}
                            />
                            <Button aria-label={showPassword ? m["login.hidePassword"]() : m["login.showPassword"]()} aria-pressed={showPassword} class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onclick={() => showPassword = !showPassword} size="sm"
                                    type="button"
                                    variant="ghost">
                                {#if showPassword}
                                    <EyeOff size={16} class="text-muted-foreground"/>
                                {:else}
                                    <Eye size={16} class="text-muted-foreground"/>
                                {/if}
                            </Button>
                        </div>
                        {#if password.length > 0}
                            <div class="flex gap-1 mt-1">
                                <div class="h-1 w-full rounded bg-muted">
                                    <div class="h-full rounded transition-all duration-300 {passwordStrength() === 'weak' ? 'w-1/3 bg-red-500' : passwordStrength() === 'medium' ? 'w-2/3 bg-yellow-500' : passwordStrength() === 'strong' ? 'w-full bg-green-500' : 'w-0'}"></div>
                                </div>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                {#if passwordStrength() === 'weak'}
                                    {m["settings.profile.passwordStrength.weak"]()}
                                {:else if passwordStrength() === 'medium'}
                                    {m["settings.profile.passwordStrength.medium"]()}
                                {:else if passwordStrength() === 'strong'}
                                    {m["settings.profile.passwordStrength.strong"]()}
                                {/if}
                            </p>
                        {/if}
                    </div>

                    <div class="flex w-full flex-col gap-1.5">
                        <Label class="flex items-center gap-2" for="passwordConfirm">
                            {m["settings.profile.confirmPassword"]()}
                            {#if password.length > 0 && passwordConfirm.length > 0}
                                {#if passwordsMatch}
                                    <span class="text-green-600 text-xs">{m["settings.profile.match"]()}</span>
                                {:else}
                                    <span class="text-red-600 text-xs">{m["settings.profile.mismatch"]()}</span>
                                {/if}
                            {/if}
                        </Label>
                        <div class="relative">
                            <Input
                                    bind:value={passwordConfirm}
                                    class="pr-10 {passwordConfirm.length > 0 && !passwordsMatch ? 'border-red-500' : ''}"
                                    id="passwordConfirm"
                                    maxlength={255}
                                    name="passwordConfirm"
                                    placeholder={m["settings.profile.confirmPasswordPlaceholder"]()}
                                    type={showPasswordConfirm ? "text" : "password"}
                            />
                            <Button aria-label={showPasswordConfirm ? m["login.hidePassword"]() : m["login.showPassword"]()} aria-pressed={showPasswordConfirm} class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onclick={() => showPasswordConfirm = !showPasswordConfirm} size="sm"
                                    type="button"
                                    variant="ghost">
                                {#if showPasswordConfirm}
                                    <EyeOff size={16} class="text-muted-foreground"/>
                                {:else}
                                    <Eye size={16} class="text-muted-foreground"/>
                                {/if}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Separator.Root class="my-2"/>

            <div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <Trash2 class="text-destructive" size={16}/>
                        <h3 class="text-sm font-medium text-destructive">
                            {m["settings.profile.delete.title"]()}
                        </h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        {m["settings.profile.delete.description"]()}
                    </p>
                    <Dialog.Root bind:open={confirmDeleteOpen}>
                        <Dialog.Trigger>
                            {#snippet child({ props })}
                                <Button
                                        {...props}
                                        class="w-fit"
                                        type="button"
                                variant="destructive"
                                >
                                {m["settings.profile.delete.cta"]()}
                                </Button>
                            {/snippet}
                        </Dialog.Trigger>
                        <Dialog.Content class="sm:max-w-md">
                            <form
                                    action="?/delete"
                                    class="space-y-4"
                                    method="POST"
                                    use:enhance={() => {
                                        return async ({ result }) => {
                                            if (result.type === 'redirect') {
                                                return goto(result.location, { replaceState: true });
                                            }

                                            if (result.type === 'failure') {
                                                const failureData = result.data as {
                                                    currentPasswordRequired?: boolean;
                                                    currentPasswordInvalid?: boolean;
                                                } | undefined;
                                                if (failureData?.currentPasswordRequired) {
                                                    toast.error(m["settings.profile.currentPasswordRequired"]());
                                                    return;
                                                }
                                                if (failureData?.currentPasswordInvalid) {
                                                    toast.error(m["settings.profile.currentPasswordInvalid"]());
                                                    return;
                                                }
                                            }

                                            toast.error(m["settings.profile.error"]());
                                        };
                                    }}>
                                <Dialog.Header>
                                    <Dialog.Title>{m["settings.profile.delete.confirmTitle"]()}</Dialog.Title>
                                    <Dialog.Description class="space-y-1">
                                        <p>{m["settings.profile.delete.confirmDescription"]()}</p>
                                    </Dialog.Description>
                                </Dialog.Header>
                                <div class="space-y-4 mt-3">
                                    <div class="flex w-full flex-col gap-1.5">
                                        <Label for="delete-confirm">
                                            <div class="flex flex-col gap-2">
                                                {m["settings.profile.delete.confirmLabel"]()}
                                                <p class="text-xs text-muted-foreground">
                                                    {m["settings.profile.delete.typeToConfirm"]({username: user.username})}
                                                </p>
                                            </div>
                                        </Label>
                                        <Input
                                                autocomplete="off"
                                                bind:value={deleteConfirmInput}
                                                id="delete-confirm"
                                                placeholder={m["settings.profile.delete.confirmPlaceholder"]({username: user.username})}
                                                type="text"
                                        />
                                    </div>
                                    <div class="flex w-full flex-col gap-1.5">
                                        <Label for="delete-current-password">
                                            {m["settings.profile.currentPassword"]()}
                                        </Label>
                                        <div class="relative">
                                            <Input
                                                    autocomplete="current-password"
                                                    bind:value={deletePassword}
                                                    class="pr-10"
                                                    id="delete-current-password"
                                                    name="currentPassword"
                                                    placeholder={m["settings.profile.currentPasswordPlaceholder"]()}
                                                    required
                                                    type={showDeletePassword ? "text" : "password"}
                                            />
                                            <Button
                                                    aria-label={showDeletePassword ? m["login.hidePassword"]() : m["login.showPassword"]()}
                                                    aria-pressed={showDeletePassword}
                                                    class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onclick={() => showDeletePassword = !showDeletePassword}
                                                    size="sm"
                                                    type="button"
                                                    variant="ghost">
                                                {#if showDeletePassword}
                                                    <EyeOff size={16} class="text-muted-foreground"/>
                                                {:else}
                                                    <Eye size={16} class="text-muted-foreground"/>
                                                {/if}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Dialog.Footer class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                    <Dialog.Close class={buttonVariants({variant: "outline"})} type="button">
                                        {m["actions.cancel"]()}
                                    </Dialog.Close>
                                    <Button
                                            aria-disabled={!canDelete}
                                            disabled={!canDelete}
                                            type="submit"
                                            variant="destructive">
                                        {m["settings.profile.delete.cta"]()}
                                    </Button>
                                </Dialog.Footer>
                            </form>
                        </Dialog.Content>
                    </Dialog.Root>
                </div>
            </div>
        </div>
    </Card.Content>
    <Card.Footer class="flex-col items-start gap-2">
        <Button
                disabled={(isChangingPassword && (!passwordsMatch || password.length < MIN_PASSWORD_LENGTH)) || (requiresCurrentPassword && currentPassword.length === 0)}
                type="submit">
            {m["settings.profile.save"]()}
        </Button>
    </Card.Footer>
</Card.Root>
