<script lang="ts">
    import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {Button} from "$lib/components/ui/button";
    import {LogOut, Plus, Settings as SettingsIcon, ShieldCheck, User as UserIcon} from "lucide-svelte";
    import type {PublicUser} from "$lib/server/db/schema";
    import {m} from "$lib/paraglide/messages";
    import {page} from "$app/state";

    const {user}: { user: PublicUser } = $props();

    const links = [
        {href: "/", label: m["nav.explore"]},
        {href: "/recipe/search", label: m["nav.recipes"]},
        {href: "/favorites", label: m["nav.favorites"]},
        {href: "/collection", label: m["nav.collection"]},
        {href: "/meal-plan", label: m["nav.mealPlan"]},
    ];

    const isActive = (href: string) =>
        href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href);
</script>

<nav class="sticky top-0 z-40 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 border-b border-border/70 bg-background/85 px-4 py-2 backdrop-blur-xl sm:top-3 sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:border sm:px-5 sm:shadow-xl lg:px-6">
    <a href="/" class="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:opacity-90">
        <h2 class="cookify text-xl font-semibold lg:text-2xl">
            cookify
        </h2>
    </a>

    <!-- Desktop Navigation -->
    <div class="absolute left-1/2 hidden -translate-x-1/2 lg:block">
        <NavigationMenu.Root>
            <NavigationMenu.List>
                {#each links as link}
                    <NavigationMenu.Item>
                        <NavigationMenu.Link href={link.href} class={isActive(link.href) ? "text-primary" : ""}>
                            {link.label()}
                        </NavigationMenu.Link>
                    </NavigationMenu.Item>
                {/each}
            </NavigationMenu.List>
        </NavigationMenu.Root>
    </div>

    <div class="flex items-center gap-2 lg:gap-3">
        {#if user}
            <a aria-label={m["nav.create"]()} href="/recipe/create" class="lg:hidden">
                <Button class="size-9 rounded-full" size="icon" variant="outline">
                    <Plus class="size-4"/>
                </Button>
            </a>
            <a href="/recipe/create" class="hidden lg:inline-block">
                <Button variant="outline">
                    <Plus class="mr-2 size-4"/>{m["nav.create"]()}
                </Button>
            </a>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Avatar.Root class="h-9 w-9 cursor-pointer ring-1 ring-border lg:h-10 lg:w-10">
                        <Avatar.Image src={user.avatar}/>
                        <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                    </Avatar.Root>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="w-64" sideOffset={8}>
                    <DropdownMenu.Label class="font-normal">
                        <div class="flex items-center gap-2">
                            <Avatar.Root class="h-8 w-8">
                                <Avatar.Image alt="" src={user.avatar}/>
                                <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                            </Avatar.Root>
                            <div class="grid gap-0.5 overflow-hidden">
                                <p class="truncate text-sm font-medium leading-none">{user.username}</p>
                                <p class="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Group>
                        <DropdownMenu.Item>
                            <a class="flex w-full items-center gap-2" href="/profile/{user.id}">
                                <UserIcon class="size-4 text-muted-foreground"/>
                                {m["nav.profile"]()}
                            </a>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item>
                            <a class="flex w-full items-center gap-2" href="/settings">
                                <SettingsIcon class="size-4 text-muted-foreground"/>
                                {m["nav.settings"]()}
                            </a>
                        </DropdownMenu.Item>
                        {#if user.administrator}
                            <DropdownMenu.Item>
                                <a class="flex w-full items-center gap-2" href="/administration">
                                    <ShieldCheck class="size-4 text-muted-foreground"/>
                                    Administration
                                </a>
                            </DropdownMenu.Item>
                        {/if}
                    </DropdownMenu.Group>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Item class="text-destructive">
                        <form class="w-full" method="post" action="/logout">
                            <button class="flex w-full items-center gap-2" type="submit">
                                <LogOut class="size-4"/>
                                {m["logout"]()}
                            </button>
                        </form>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        {:else}
            <a href="/login">
                <Button variant="ghost">{m["nav.login"]()}</Button>
            </a>
        {/if}
    </div>
</nav>
