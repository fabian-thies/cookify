<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Separator from "$lib/components/ui/separator/index.js";
    import type {PublicUser} from "$lib/server/db/schema";
    import {Camera, Eye, EyeOff, Lock} from "lucide-svelte";

    const {user}: { user: PublicUser } = $props();

    let fileInput: HTMLInputElement;
    let selectedFile = $state<File | null>(null);
    let showPassword = $state(false);
    let showPasswordConfirm = $state(false);

    let previewUrl = $derived(
        selectedFile ? URL.createObjectURL(selectedFile) : null
    );

    function handleAvatarChange(event: Event) {
        const files = (event.target as HTMLInputElement).files;
        selectedFile = files?.[0] ?? null;
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
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>Profil</Card.Title>
        <Card.Description>Verwalten Sie Ihre persönlichen Informationen</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-6">
                <Avatar.Root class="cursor-pointer h-8 w-8 md:h-10 md:w-10 lg:h-24 lg:w-24">
                    <Avatar.Image src={previewUrl ?? user.avatar}/>
                    <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                </Avatar.Root>
                <input
                        bind:this={fileInput}
                        id="avatar"
                        class="hidden"
                        type="file"
                        accept="image/*"
                        name="avatar"
                        onchange={handleAvatarChange}
                />
                <Button variant="outline" class="flex items-center gap-2" onclick={() => fileInput.click()}>
                    <Camera size={16}/>
                    Avatar ändern
                </Button>
            </div>
            <div class="flex w-full flex-col gap-1.5">
                <Label for="username">Username</Label>
                <Input
                        type="text"
                        id="username"
                        name="username"
                        placeholder="z.B. MaxMustermann"
                        required
                        value={user.username}
                />
            </div>
            <div class="flex w-full flex-col gap-1.5">
                <Label for="email">E-Mail</Label>
                <Input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="z.B. max@example.com"
                        required
                        value={user.email}
                />
            </div>
            <Separator.Root class="my-2"/>
            <div class="space-y-4">
                <div class="flex items-center gap-2 mb-4">
                    <Lock size={16} class="text-muted-foreground"/>
                    <h3 class="text-sm font-medium">Passwort ändern</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                    <div class="flex w-full flex-col gap-1.5">
                        <Label for="password">Neues Passwort</Label>
                        <div class="relative">
                            <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="Neues Passwort eingeben"
                                    bind:value={password}
                                    class="pr-10"
                            />
                            <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onclick={() => showPassword = !showPassword}
                            >
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
                                    <div
                                            class="h-full rounded transition-all duration-300 {
                                            passwordStrength() === 'weak' ? 'w-1/3 bg-red-500' :
                                            passwordStrength() === 'medium' ? 'w-2/3 bg-yellow-500' :
                                            passwordStrength() === 'strong' ? 'w-full bg-green-500' : 'w-0'
                                        }"
                                    ></div>
                                </div>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                {passwordStrength() === 'weak' ? 'Schwach - mindestens 6 Zeichen' :
                                    passwordStrength() === 'medium' ? 'Mittel - mindestens 10 Zeichen empfohlen' :
                                        'Stark'}
                            </p>
                        {/if}
                    </div>
                    <div class="flex w-full flex-col gap-1.5">
                        <Label for="passwordConfirm" class="flex items-center gap-2">
                            Passwort bestätigen
                            {#if password.length > 0 && passwordConfirm.length > 0}
                                {#if passwordsMatch}
                                    <span class="text-green-600 text-xs">Stimmt überein</span>
                                {:else}
                                    <span class="text-red-600 text-xs">Stimmt nicht überein</span>
                                {/if}
                            {/if}
                        </Label>
                        <div class="relative">
                            <Input
                                    type={showPasswordConfirm ? "text" : "password"}
                                    id="passwordConfirm"
                                    name="passwordConfirm"
                                    placeholder="Passwort wiederholen"
                                    bind:value={passwordConfirm}
                                    class="pr-10 {passwordConfirm.length > 0 && !passwordsMatch ? 'border-red-500' : ''}"
                            />
                            <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onclick={() => showPasswordConfirm = !showPasswordConfirm}
                            >
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
        <Button
                type="submit"
                disabled={password.length > 0 && (!passwordsMatch || password.length < 6)}
        >
            Profil speichern
        </Button>
    </Card.Footer>
</Card.Root>