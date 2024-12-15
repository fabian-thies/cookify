<script lang="ts">
    import {Button, Heading} from "flowbite-svelte";
</script>

<div class="flex items-center justify-center min-h-screen -mt-24 py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
    <div class="mx-auto max-w-screen-sm text-center">
        <Heading customSize="text-8xl font-black mb-6" tag="h1">404</Heading>
        <p class="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">
            Die Seite fehlt.
        </p>
        <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
            Leider konnten wir die Seite, die du suchst, nicht finden.
        </p>
        <Button class="my-4" color="red" href="/" size="lg">
            Zurück zur Startseite
        </Button>
    </div>
</div>
