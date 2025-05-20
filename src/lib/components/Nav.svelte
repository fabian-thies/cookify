<script lang="ts">
    import {page} from '$app/state';
    import {NavActionType} from "$lib/types/nav";
    import {enhance} from '$app/forms';

    let {data}: PageProps = $props();


    let navActions: NavAction[] = $state([]);

    $effect(() => {
        navActions = page.data.navActions;
    });
</script>

<nav class="navbar bg-base-100 mx-auto py-6 px-22 flex items-center justify-between">
    <div class="flex-shrink-0">
        <a class="text-2xl font-bold text-primary" href="/">cookify</a>
    </div>
    {#if navActions}
        <div class="flex items-center space-x-3">
            {#each navActions as action}
                {#if action.type === NavActionType.CANCEL}
                    <a class="btn btn-neutral flex items-center gap-2 px-4 min-w-24" href={action.formaction}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                             class="bi bi-x"
                             viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                        Cancel
                    </a>
                {/if}
                {#if action.type === NavActionType.PUBLISH}
                    <button class="btn btn-primary flex items-center gap-2 px-4 min-w-24" type="submit"
                            form={action.formId}
                            formaction={action.formaction}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                             stroke="currentColor" width="16" height="16">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                        </svg>
                        Publish
                    </button>
                {/if}
            {/each}
        </div>
    {:else}
        <div class="dropdown dropdown-end">
            {#if data.user.avatarUrl}
                <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
                    <div class="w-10 rounded-full">
                        <img
                                alt="Avatar"
                                src={data.user.avatarUrl}/>
                    </div>
                </div>
            {:else}
                <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar avatar-placeholder">
                    <div class="bg-neutral text-neutral-content w-12 rounded-full">
                        <span class="text-xs">{ data.user.username.slice(0, 2) }</span>
                    </div>
                </div>
            {/if}
            <ul
                    tabindex="0"
                    class="menu menu-sm dropdown-content bg-base-200 rounded-box z-1 mt-3 w-52 p-2 shadow-lg">
                <li>
                    <a href="/settings">
                        Settings
                    </a>
                </li>
                <form method="POST" action="?/logout" use:enhance>
                    <li>
                        <button type="submit">Logout</button>
                    </li>
                </form>
            </ul>
        </div>
    {/if}
</nav>
