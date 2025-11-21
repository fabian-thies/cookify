<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {m} from "$lib/paraglide/messages";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Separator from "$lib/components/ui/separator/index.js";
    import type {PublicUser} from "$lib/server/db/schema";
    import {Camera, Eye, EyeOff, Languages, Lock} from "lucide-svelte";
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";

    const {user}: { user: PublicUser } = $props();

    let fileInput: HTMLInputElement;
    let selectedFile = $state<File | null>(null);
    let showPassword = $state(false);
    let showPasswordConfirm = $state(false);

    let previewUrl = $derived(selectedFile ? URL.createObjectURL(selectedFile) : null);

    function handleAvatarChange(event: Event) {
        const files = (event.target as HTMLInputElement).files;
        selectedFile = files?.[0] ?? null;
    }

    function openAvatarPicker() {
        fileInput?.click();
    }

    let password = $state('');
    let passwordConfirm = $state('');

    let passwordsMatch = $derived(password === passwordConfirm && password.length > 0);
    let passwordStrength = $derived(() => {
        if (password.length === 0) return 'none';
        if (password.length < 6) return 'weak';
        if (password.length < 10) return 'medium';
        return 'strong';
    });

    let selectedLanguage = $state(user.language || 'en');

    // TODO: Combine with db schema enum
    const languageOptions = [
        {value: 'en', label: m['settings.profile.languages.en']()},
        {value: 'de', label: m['settings.profile.languages.de']()},
        {value: 'es', label: m['settings.profile.languages.es']()}
    ];
</script>

<Card.Root class="w-full mt-6">
    <Card.Header>
        <Card.Title>{m["settings.profile.title"]()}</Card.Title>
        <Card.Description>{m["settings.profile.description"]()}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-6">
                <button aria-controls="avatar"
                        aria-label={m["settings.profile.changeAvatar"]()}
                        class="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background" onclick={openAvatarPicker}
                        type="button">
                    <Avatar.Root class="cursor-pointer h-8 w-8 md:h-10 md:w-10 lg:h-24 lg:w-24">
                        <Avatar.Image src={previewUrl ?? user.avatar}/>
                        <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
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
                <Input id="username" name="username" placeholder={m["settings.profile.usernamePlaceholder"]()}
                       required type="text" value={user.username}/>
            </div>

            <div class="flex w-full flex-col gap-1.5">
                <Label for="email">{m["settings.profile.email"]()}</Label>
                <Input id="email" name="email" placeholder={m["settings.profile.emailPlaceholder"]()} required
                       type="email" value={user.email}/>
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
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="flex w-full flex-col gap-1.5">
                        <Label for="password">{m["settings.profile.newPassword"]()}</Label>
                        <div class="relative">
                            <Input
                                    bind:value={password}
                                    class="pr-10"
                                    id="password"
                                    name="password"
                                    placeholder={m["settings.profile.newPasswordPlaceholder"]()}
                                    type={showPassword ? "text" : "password"}
                            />
                            <Button class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onclick={() => showPassword = !showPassword} size="sm"
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
                                    name="passwordConfirm"
                                    placeholder={m["settings.profile.confirmPasswordPlaceholder"]()}
                                    type={showPasswordConfirm ? "text" : "password"}
                            />
                            <Button class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onclick={() => showPasswordConfirm = !showPasswordConfirm} size="sm"
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
        </div>
    </Card.Content>
    <Card.Footer class="flex-col gap-2 items-start">
        <Button disabled={password.length > 0 && (!passwordsMatch || password.length < 6)} type="submit">
            {m["settings.profile.save"]()}
        </Button>
    </Card.Footer>
</Card.Root>
