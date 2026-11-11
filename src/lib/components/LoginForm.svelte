<script lang="ts">
    import {enhance} from '$app/forms';
    import {Button} from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {cn} from "$lib/utils.js";
    import type {HTMLAttributes} from "svelte/elements";
    import {m} from "$lib/paraglide/messages.js";
    import {page} from "$app/state";
    import {goto} from "$app/navigation";
    import {browserSupportsWebAuthn} from "@simplewebauthn/browser";
    import {loginWithPasskey} from "$lib/passkey";
    import {toast} from "svelte-sonner";
    import Fingerprint from "@lucide/svelte/icons/fingerprint";
    import {Eye, EyeOff} from "lucide-svelte";
    import {Spinner} from "$lib/components/ui/spinner";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        class?: string;
        isLogin?: boolean;
        allowRegistrations?: boolean;
    }

    let {class: className, isLogin = $bindable(false), allowRegistrations = true, ...restProps}: Props = $props();
    const id = $props.id();

    const form = $derived(page.form);
    const redirectTo = $derived(page.url.searchParams.get('redirectTo'));

    $effect(() => {
        if (!allowRegistrations) {
            isLogin = true;
        }
    });

    const effectiveIsLogin = $derived(allowRegistrations ? isLogin : true);

    let passkeySupported = $state(false);
    let passkeyBusy = $state(false);
    let submitting = $state(false);
    let showPassword = $state(false);

    $effect(() => {
        passkeySupported = browserSupportsWebAuthn();
    });

    async function handlePasskeyLogin() {
        passkeyBusy = true;
        try {
            await loginWithPasskey();
            await goto(redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/");
        } catch (e) {
            console.error(e);
            toast.error(m["login.passkeyError"]());
        } finally {
            passkeyBusy = false;
        }
    }
</script>

<div {...restProps} class={cn("flex flex-col gap-6", className)}>
    {#if form?.message}
        <Alert.Root variant="destructive">
            <CircleAlertIcon class="size-4"/>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>
                {form.message}
            </Alert.Description>
        </Alert.Root>
    {/if}
    <Card.Root class="border-border/70 shadow-xl shadow-black/10">
        <Card.Header class="text-center">
            <Card.Title class="text-xl">
                {effectiveIsLogin ? m["login.welcomeBack"]() : m["login.createAccount"]()}
            </Card.Title>
            <Card.Description>
                {effectiveIsLogin ? m["login.signInToContinue"]() : m["login.enterDetailsToStart"]()}
            </Card.Description>
        </Card.Header>
        <Card.Content>
            <form action="{effectiveIsLogin ? '?/login' : '?/register'}" method="post" use:enhance={() => {
                submitting = true;
                return async ({update}) => {
                    try {
                        await update();
                    } finally {
                        submitting = false;
                    }
                };
            }}>
                {#if redirectTo}
                    <input type="hidden" name="redirectTo" value={redirectTo}/>
                {/if}
                <div class="grid gap-6">
                    <div class="grid gap-5">
                        <div class="grid gap-3">
                            <Label for="username-{id}">{m["login.username"]()}</Label>
                            <Input
                                    autocomplete="username"
                                    id="username-{id}"
                                    name="username"
                                    placeholder={m["login.enterUsername"]()}
                                    required
                                    type="text"
                            />
                        </div>
                        {#if !effectiveIsLogin}
                            <div class="grid gap-3">
                                <Label for="email-{id}">{m["login.email"]()}</Label>
                                <Input
                                        autocomplete="email"
                                        id="email-{id}"
                                        name="email"
                                        placeholder={m["login.emailPlaceholder"]()}
                                        required
                                        type="email"
                                />
                            </div>
                        {/if}
                        <div class="grid gap-3">
                            <Label for="password-{id}">{m["login.password"]()}</Label>
                            <div class="relative">
                                <Input
                                        autocomplete={effectiveIsLogin ? "current-password" : "new-password"}
                                        class="pr-11"
                                        id="password-{id}"
                                        name="password"
                                        required
                                        type={showPassword ? "text" : "password"}
                                />
                                <Button
                                        aria-label={m["login.password"]()}
                                        class="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                                        onclick={() => showPassword = !showPassword}
                                        size="sm"
                                        type="button"
                                        variant="ghost"
                                >
                                    {#if showPassword}
                                        <EyeOff class="size-4"/>
                                    {:else}
                                        <Eye class="size-4"/>
                                    {/if}
                                </Button>
                            </div>
                        </div>
                        {#if !effectiveIsLogin}
                            <div class="grid gap-3">
                                <Label for="confirm-password-{id}">{m["login.confirmPassword"]()}</Label>
                                <Input
                                        autocomplete="new-password"
                                        id="confirm-password-{id}"
                                        name="confirmPassword"
                                        placeholder={m["login.confirmPasswordPlaceholder"]()}
                                        required
                                        type={showPassword ? "text" : "password"}
                                />
                            </div>
                        {/if}
                        <Button class="w-full" disabled={submitting} size="lg" type="submit">
                            {#if submitting}
                                <Spinner class="size-4"/>
                            {:else}
                                {effectiveIsLogin ? m["login.signIn"]() : m["login.createAccountButton"]()}
                            {/if}
                        </Button>
                    </div>
                    {#if effectiveIsLogin && passkeySupported}
                        <div class="flex items-center gap-2">
                            <span class="h-px flex-1 bg-border"></span>
                            <span class="text-xs uppercase text-muted-foreground">{m["login.or"]()}</span>
                            <span class="h-px flex-1 bg-border"></span>
                        </div>
                        <Button class="w-full" disabled={passkeyBusy} onclick={handlePasskeyLogin} size="lg" type="button" variant="outline">
                            <Fingerprint class="size-4"/>
                            {m["login.passkey"]()}
                        </Button>
                    {/if}
                    <div class="text-center text-sm text-muted-foreground">
                        {#if allowRegistrations}
                            {effectiveIsLogin ? m["login.noAccount"]() : m["login.haveAccount"]()}
                        {:else}
                            Registrations are currently disabled.
                        {/if}
                        <button
                                class="underline underline-offset-4 hover:no-underline cursor-pointer"
                                onclick={() => allowRegistrations && (isLogin = !isLogin)}
                                type="button"
                                disabled={!allowRegistrations}
                        >
                            {allowRegistrations ? (effectiveIsLogin ? m["login.signUp"]() : m["login.signInLink"]()) : m["login.signIn"]()}
                        </button>
                    </div>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
