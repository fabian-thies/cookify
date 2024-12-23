<script lang="ts">
    import {Button, Input, Label} from "flowbite-svelte";
    import type {ActionData} from './$types';
    import {enhance} from "$app/forms";

    const {form}: { form: ActionData } = $props();
</script>

<section class="w-[30rem] mx-auto my-28">
    <form class="flex flex-col space-y-6" method="POST" use:enhance>
        <h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Registriere dein Account</h3>
        {#if form?.message}
            <p class="text-red-500 text-sm">
                { form.message.error }
            </p>
        {/if}
        <Label class="space-y-2">
            <span>Nutzername</span>
            <Input name="username" placeholder="Dein Nutzername" required type="text"/>
        </Label>
        <Label class="space-y-2">
            <span>E-Mail</span>
            <Input name="email" placeholder="max@mustermann.de" required type="email"/>
        </Label>
        <Label class="space-y-2">
            <span>Dein Passwort</span>
            <Input name="password" placeholder="•••••••••••••••" required type="password"/>
        </Label>
        <Button class="w-full1" type="submit">Account erstellen</Button>
        <div class="text-sm font-medium text-gray-500 dark:text-gray-300">
            Du hast bereits einen Account?
            <a class="text-primary-700 hover:underline dark:text-primary-500" href="/login">Anmelden</a>
        </div>
    </form>
</section>
