<script lang="ts">
    import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
    import {Button} from "$lib/components/ui/button";

    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<nav class="bg-background shadow-xs h-18 w-full flex items-center justify-between px-8">
    <a href="/">
        <h1 class="text-2xl font-bold text-foreground">cookify</h1>
    </a>
    <div class="flex items-center gap-4">
        <NavigationMenu.Root class="hover:cursor-pointer">
            <NavigationMenu.List>
                <NavigationMenu.Item>
                    <NavigationMenu.Trigger>Rezepte</NavigationMenu.Trigger>
                    <NavigationMenu.Content>
                        <ul class="grid gap-2 p-2">
                            <li>
                                <NavigationMenu.Link href="/">Rezepte</NavigationMenu.Link>
                            </li>
                            <li>
                                <NavigationMenu.Link href="/favorite">Favoriten</NavigationMenu.Link>
                            </li>
                        </ul>
                    </NavigationMenu.Content>
                </NavigationMenu.Item>
            </NavigationMenu.List>
        </NavigationMenu.Root>
        <Button href="/recipe/create" data-sveltekit-preload-data="hover">
            Rezept erstellen
        </Button>
    </div>
    {#if isOpen}
    {/if}
</nav>