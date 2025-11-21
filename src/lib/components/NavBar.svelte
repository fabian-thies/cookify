<script lang="ts">
    import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Sheet from "$lib/components/ui/sheet";
    import {Button} from "$lib/components/ui/button";
    import {Menu, Plus, ShieldCheck, User as UserIcon, Settings as SettingsIcon} from "lucide-svelte";
    import type {PublicUser} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages.js";
    import {Separator} from "$lib/components/ui/separator";

    let isOpen = $state(false);

    const {user}: { user: PublicUser } = $props();
</script>

<nav class="sticky top-3 z-40 mx-auto mt-2 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-4 py-2 shadow-xl backdrop-blur-xl md:px-6">
    <a href="/" class="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:border-transparent hover:opacity-90">
        <h2 class="cookify text-xl md:text-2xl font-semibold">
            cookify
        </h2>
    </a>

    <!-- Desktop Navigation -->
    <div class="hidden md:block absolute left-1/2 -translate-x-1/2">
        <NavigationMenu.Root>
            <NavigationMenu.List>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/">
                        {m["nav.explore"]()}
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/recipe/search">
                        {m["nav.recipes"]()}
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/favorites">
                        {m["nav.favorites"]()}
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
                <NavigationMenu.Item>
                    <NavigationMenu.Link href="/collection">
                        {m["nav.collection"]()}
                    </NavigationMenu.Link>
                </NavigationMenu.Item>
            </NavigationMenu.List>
        </NavigationMenu.Root>
    </div>

    <div class="flex items-center gap-2 md:gap-4">
        <!-- Mobile Menu Button -->
        <Sheet.Root bind:open={isOpen}>
            <Sheet.Trigger class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-70">
                <Menu class="h-5 w-5"/>
            </Sheet.Trigger>
            <Sheet.Content class="w-80 bg-card/95 backdrop-blur-xl border-l border-border/70" side="left">
                <Sheet.Header>
                    <Sheet.Title>{m["nav.navigation"]()}</Sheet.Title>
                </Sheet.Header>
                <div class="flex flex-col gap-4 mt-6 m-6 text-lg">
                    <a href="/" onclick={() => isOpen = false}>
                        {m["nav.recipes"]()}
                    </a>
                    <a href="/favorites" onclick={() => isOpen = false}>
                        {m["nav.favorites"]()}
                    </a>
                    <a href="/collection" onclick={() => isOpen = false}>
                        {m["nav.collection"]()}
                    </a>
                    <a href="/recipe/create" onclick={() => isOpen = false}>
                        {m["nav.create"]()}
                    </a>
                    <Separator/>
                    <a href="/profile/{user.id}" onclick={() => isOpen = false}>
                        {m["nav.profile"]()}
                    </a>
                    <a href="/settings" onclick={() => isOpen = false}>
                        {m["nav.settings"]()}
                    </a>
                    <form action="/logout" class="mt-4 text-destructive" method="post">
                        <Button class="w-full hover:cursor-pointer" type="submit" variant="outline">
                            {m["logout"]()}
                        </Button>
                    </form>
                </div>
            </Sheet.Content>
        </Sheet.Root>

        <!-- User Avatar Dropdown -->
        {#if user}
            <a href="/recipe/create" class="hidden md:inline-block">
                <Button variant="outline" class="mr-2">
                    <Plus class="h-4 w-4 mr-2"/>{m["nav.create"]()}
                </Button>
            </a>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger class="hidden md:block">
                    <Avatar.Root class="cursor-pointer h-8 w-8 md:h-10 md:w-10">
                        <Avatar.Image src={user.avatar}/>
                        <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                    </Avatar.Root>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" sideOffset={8} class="w-56 hidden md:block">
                    <DropdownMenu.Label class="font-normal">
                        <div class="flex items-center gap-2">
                            <Avatar.Root class="h-8 w-8">
                                <Avatar.Image src={user.avatar} alt=""/>
                                <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                            </Avatar.Root>
                            <div class="grid gap-0.5">
                                <p class="text-sm font-medium leading-none">{user.username}</p>
                                <p class="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Group>
                        <DropdownMenu.Item class="flex items-center gap-2">
                            <UserIcon class="size-4 text-muted-foreground"/>
                            <a href="/profile/{user.id}">{m["nav.profile"]()}</a>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item class="flex items-center gap-2">
                            <SettingsIcon class="size-4 text-muted-foreground"/>
                            <a href="/settings">{m["nav.settings"]()}</a>
                        </DropdownMenu.Item>
                        {#if user.administrator}
                            <DropdownMenu.Item class="flex items-center gap-2">
                                <ShieldCheck class="size-4 text-muted-foreground"/>
                                <a href="/administration">Administration</a>
                            </DropdownMenu.Item>
                        {/if}
                    </DropdownMenu.Group>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Item class="text-destructive">
                        <form method="post" action="/logout">
                            <button type="submit">
                                {m["logout"]()}
                            </button>
                        </form>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        {:else}
            <div class="hidden md:block">
                <a href="/login">
                    <Button variant="ghost">{m["nav.login"]()}</Button>
                </a>
            </div>
        {/if}
    </div>
</nav>
