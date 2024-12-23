<script lang="ts">
    import {Button, Heading} from "flowbite-svelte";
    import {page} from "$app/state";
</script>

<div class="flex items-center justify-center min-h-screen -mt-24 py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
    <div class="mx-auto max-w-screen-sm text-center">
        <!-- ErrorStatus -->
        <Heading customSize="text-8xl font-black mb-6" tag="h1">
            {page.status || 500}
        </Heading>
        <!-- ErrorMessage -->
        <p class="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">
            {page.error?.message || "Ein unerwarteter Fehler ist aufgetreten."}
        </p>
        <!-- ErrorDescription -->
        <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
            {page.error?.description || "Bitte überprüfen Sie die URL oder versuchen Sie es später erneut."}
        </p>
        <Button class="my-4" color="red" href="/" size="lg">
            Zurück zur Startseite
        </Button>
    </div>
</div>
