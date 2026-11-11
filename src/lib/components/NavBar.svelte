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
        href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href === "/recipe/search" ? "/recipe/" : href);
</script>

<nav class="sticky top-0 z-40 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:top-3 sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:border sm:border-border/70 sm:bg-card/70 sm:px-5 sm:shadow-sm lg:px-6">
    <a class="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:opacity-80" href="/">
        <h2 class="cookify text-xl font-semibold tracking-tight lg:text-2xl">
            cookify
        </h2>
    </a>

    <!-- Desktop Navigation -->
    <div class="absolute left-1/2 hidden -translate-x-1/2 lg:block">
        <NavigationMenu.Root>
            <NavigationMenu.List>
                {#each links as link}
                    <NavigationMenu.Item>
                        <NavigationMenu.Link
                                class={isActive(link.href) ? "font-medium text-foreground" : "font-medium text-muted-foreground hover:text-foreground"}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                href={link.href}
                        >
                            {link.label()}
                        </NavigationMenu.Link>
                    </NavigationMenu.Item>
                {/each}
            </NavigationMenu.List>
        </NavigationMenu.Root>
    </div>

    <div class="flex items-center gap-1.5 lg:gap-2.5">
        {#if user}
            <Button aria-label={m["nav.create"]()} href="/recipe/create" class="rounded-full lg:hidden" size="icon" variant="outline">
                    <Plus class="size-4"/>
            </Button>
            <Button href="/recipe/create" class="hidden lg:inline-flex" variant="outline">
                    <Plus class="size-4"/>{m["nav.create"]()}
            </Button>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger class="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring" aria-label={m["nav.profile"]()}>
                    <Avatar.Root class="size-8 cursor-pointer ring-1 ring-border transition hover:ring-primary/50 lg:size-9">
                        <Avatar.Image src={user.avatar}/>
                        <Avatar.Fallback class="text-xs">{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
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
