<script lang="ts">
    import {page} from "$app/state";
    import {BookOpen, CalendarDays, Compass, Heart, Library} from "lucide-svelte";
    import {m} from "$lib/paraglide/messages";

    const items = [
        {href: "/", label: m["nav.explore"], icon: Compass},
        {href: "/recipe/search", label: m["nav.recipes"], icon: BookOpen},
        {href: "/favorites", label: m["nav.favorites"], icon: Heart},
        {href: "/collection", label: m["nav.collection"], icon: Library},
        {href: "/meal-plan", label: m["nav.mealPlan"], icon: CalendarDays},
    ];

    const isActive = (href: string) =>
        href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href);
</script>

<nav
        aria-label={m["nav.navigation"]()}
        class="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/85 backdrop-blur-xl lg:hidden"
>
    <ul class="flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {#each items as item}
            {@const active = isActive(item.href)}
            <li class="flex-1">
                <a
                        aria-current={active ? "page" : undefined}
                        class="flex h-14 flex-col items-center justify-center gap-0.5 transition-colors {active ? 'text-primary' : 'text-muted-foreground active:text-foreground'}"
                        href={item.href}
                >
                    <span class="flex h-7 w-12 items-center justify-center rounded-full transition-colors {active ? 'bg-primary/15' : ''}">
                        <item.icon class="size-5" strokeWidth={active ? 2.2 : 1.8}/>
                    </span>
                    <span class="max-w-full truncate px-0.5 text-[10px] font-medium">{item.label()}</span>
                </a>
            </li>
        {/each}
    </ul>
</nav>
