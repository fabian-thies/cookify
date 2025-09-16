<script lang="ts">
    import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Sheet from "$lib/components/ui/sheet";
    import {Button} from "$lib/components/ui/button";
    import {Menu} from "lucide-svelte";
    import type {PublicUser} from "$lib/server/db/schema";

    let isOpen = $state(false);


    const { user }: { user: PublicUser } = $props();
</script>

<nav class="bg-background shadow-xs h-18 w-full flex items-center justify-between px-4 md:px-8">
    <a href="/">
        <h1 class="text-xl md:text-2xl font-bold text-foreground">cookify</h1>
    </a>

    <!-- Desktop Navigation -->
    <div class="hidden md:block">
        <NavigationMenu.Root>
            <NavigationMenu.List>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/">
                        Rezepte
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/favorites">
                        Favoriten
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
            </NavigationMenu.List>
        </NavigationMenu.Root>
    </div>

    <div class="flex items-center gap-2 md:gap-4">
        <!-- Mobile Menu Button -->
        <Sheet.Root bind:open={isOpen}>
            <Sheet.Trigger class="md:hidden">
                <Menu class="h-5 w-5" />
            </Sheet.Trigger>
            <Sheet.Content side="left" class="w-80">
                <Sheet.Header>
                    <Sheet.Title>Navigation</Sheet.Title>
                </Sheet.Header>
                <div class="flex flex-col gap-4 mt-6 m-6 text-lg">
                    <a href="/" onclick={() => isOpen = false}>
                        Rezepte
                    </a>
                    <a href="/favorites" onclick={() => isOpen = false}>
                        Favoriten
                    </a>
                    <Separator />
                    <a href="/profile" onclick={() => isOpen = false}>
                        Profil
                    </a>
                    <a href="/settings" onclick={() => isOpen = false}>
                        Einstellungen
                    </a>
                    <form method="post" action="/logout" class="mt-4 text-destructive">
                        <Button type="submit" variant="outline" class="w-full hover:cursor-pointer">
                            Logout
                        </Button>
                    </form>
                </div>
            </Sheet.Content>
        </Sheet.Root>

        <!-- User Avatar Dropdown -->
        {#if user}
            <DropdownMenu.Root>
                        <Avatar.Image src={user.avatar}/>
                        <Avatar.Fallback>{(user.username).slice(0, 2)}</Avatar.Fallback>
                        <Avatar.Image src={user.avatar}/>
                        <Avatar.Fallback>{(user.username).slice(0, 2)}</Avatar.Fallback>
                    </Avatar.Root>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" sideOffset={8} class="w-56 hidden md:block">
                    <DropdownMenu.Label class="font-normal">
                                <Avatar.Image src={user.avatar} alt=""/>
                                <Avatar.Fallback>{(user.username).slice(0, 2)}</Avatar.Fallback>
                                <Avatar.Image src={user.avatar} alt=""/>
                                <Avatar.Fallback>{(user.username).slice(0, 2)}</Avatar.Fallback>
                                <p class="text-sm font-medium leading-none">{user.username}</p>
                                <p class="text-xs text-muted-foreground">{user.email}</p>
                                <p class="text-sm font-medium leading-none">{user.username}</p>
                                <p class="text-xs text-muted-foreground">{user.email}</p>
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
        {:else}
            <div class="hidden md:block">
                <a href="/login">
                    <Button variant="ghost">Login</Button>
                </a>
            </div>
        {/if}
    </div>
</nav>
