<script>
    import {
        Avatar,
        Dropdown,
        DropdownDivider,
        DropdownHeader,
        DropdownItem,
        Navbar,
        NavBrand,
        NavHamburger
    } from 'flowbite-svelte';

    import { page } from '$app/state';

    const user = page.data.user;
</script>

<Navbar class="my-4">
    <NavBrand href="/">
        <span class="self-center whitespace-nowrap text-xl font-bold dark:text-white">cookify</span>
    </NavBrand>
    {#if user}
        <div class="flex items-center md:order-2 cursor-pointer">
            <Avatar id="avatar-menu" src=""/>
            <NavHamburger class1="w-full md:flex md:w-auto md:order-1"/>
        </div>
        <Dropdown placement="bottom" triggeredBy="#avatar-menu">
            <DropdownHeader>
                <span class="block text-sm">{user.username}</span>
                <span class="block truncate text-sm font-medium">{user.email}</span>
            </DropdownHeader>
            <DropdownItem href="/">Startseite</DropdownItem>
            <DropdownItem href="Einstellungen">Settings</DropdownItem>
            <DropdownItem>Earnings</DropdownItem>
            <DropdownDivider/>
            <DropdownItem href="/logout">Abmelden</DropdownItem>
        </Dropdown>
    {/if}
</Navbar>