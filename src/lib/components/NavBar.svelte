<script lang="ts">
    import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {Button} from "$lib/components/ui/button";
    import type {User} from "$lib/server/db/schema";

    let isOpen = false;

    const { user }: { user: User } = $props();

    function toggleMenu() {
        isOpen = !isOpen;
    }

    function logout(): void {
        console.log("logout");
    }
</script>

<nav class="bg-background shadow-xs h-18 w-full flex items-center justify-between px-8">
    <a href="/">
        <h1 class="text-2xl font-bold text-foreground">cookify</h1>
    </a>
    <NavigationMenu.Root>
        <NavigationMenu.List>
            <NavigationMenu.Item>
                <NavigationMenu.Link href="/">
                    Rezepte
                </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
                <NavigationMenu.Link href="/">
                    Favoriten
                </NavigationMenu.Link>
            </NavigationMenu.Item>
        </NavigationMenu.List>
    </NavigationMenu.Root>
    <div class="flex items-center gap-4">
<!--        <Button href="/recipe/create" data-sveltekit-preload-data="hover">-->
<!--            Rezept erstellen-->
<!--        </Button>-->

        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                    <Avatar.Root class="cursor-pointer">
                        <Avatar.Image src={user.avatar} alt={user?.username ?? "@user"} />
                        <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                    </Avatar.Root>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" sideOffset={8} class="w-56">
                <DropdownMenu.Label class="font-normal">
                    <div class="flex items-center gap-2">
                        <Avatar.Root class="h-8 w-8">
                            <Avatar.Image src={user.avatar} alt=""/>
                            <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                        </Avatar.Root>
                        <div class="grid gap-0.5">
                            <p class="text-sm font-medium leading-none">{ user.username }</p>
                            <p class="text-xs text-muted-foreground">{ user.email }</p>
                        </div>
                    </div>
                </DropdownMenu.Label>
                <DropdownMenu.Separator/>
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <a href="/profile">Profil</a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <a href="/settings">Einstellungen</a>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator/>
                <DropdownMenu.Item class="text-destructive">
                    <form method="post" action="/logout">
                        <button type="submit">
                            Logout
                        </button>
                    </form>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
    {#if isOpen}
    {/if}
</nav>