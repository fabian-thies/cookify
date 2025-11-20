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
    <Card.Root>
        <Card.Header class="text-center">
            <Card.Title class="text-xl">
                {effectiveIsLogin ? m["login.welcomeBack"]() : m["login.createAccount"]()}
            </Card.Title>
            <Card.Description>
                {effectiveIsLogin ? m["login.signInToContinue"]() : m["login.enterDetailsToStart"]()}
            </Card.Description>
        </Card.Header>
        <Card.Content>
            <form action="{effectiveIsLogin ? '?/login' : '?/register'}" method="post" use:enhance>
                {#if redirectTo}
                    <input type="hidden" name="redirectTo" value={redirectTo}/>
                {/if}
                <div class="grid gap-6">
                    <div class="grid gap-6">
                        <div class="grid gap-3">
                            <Label for="username-{id}">{m["login.username"]()}</Label>
                            <Input
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
                                        id="email-{id}"
                                        name="email"
                                        type="email"
                                        placeholder={m["login.emailPlaceholder"]()}
                                        required
                                />
                            </div>
                        {/if}
                        <div class="grid gap-3">
                            <div class="flex items-center">
                                <Label for="password-{id}">{m["login.password"]()}</Label>
                                <!--                                {#if isLogin}
                                                                    <a
                                                                            href="##"
                                                                            class="ml-auto text-sm underline-offset-4 hover:underline"
                                                                    >
                                                                        {m["login.forgotPassword"]()}
                                                                    </a>
                                                                {/if}-->
                            </div>
                            <Input id="password-{id}" name="password" required type="password"/>
                        </div>
                        {#if !effectiveIsLogin}
                            <div class="grid gap-3">
                                <Label for="confirm-password-{id}">{m["login.confirmPassword"]()}</Label>
                                <Input
                                        id="confirm-password-{id}"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder={m["login.confirmPasswordPlaceholder"]()}
                                        required
                                />
                            </div>
                        {/if}
                        <Button class="w-full" type="submit">
                            {effectiveIsLogin ? m["login.signIn"]() : m["login.createAccountButton"]()}
                        </Button>
                    </div>
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
