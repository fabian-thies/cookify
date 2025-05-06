<script lang="ts">
    import {page} from '$app/state';
    import {type NavAction, NavActionType} from '$lib/types';

    let navActions: NavAction[] = $state([]);

    $effect(() => {
        navActions = page.data.navActions;
    });
</script>

<nav class="navbar bg-base-100 mx-auto py-4 px-22 border-b-2 border-base-300 flex items-center justify-between">
    <div class="flex-shrink-0">
        <a class="text-2xl font-bold text-primary" href="/">cookify</a>
    </div>
    <div class="flex items-center space-x-2">
        {#each navActions as action}
            {#if action.type === NavActionType.CANCEL}
                <a class="btn btn-secondary flex items-center gap-2 px-4 min-w-24" href={action.formaction}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x"
                         viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                    Cancel
                </a>
            {/if}
            {#if action.type === NavActionType.PUBLISH}
                <button class="btn btn-primary flex items-center gap-2 px-4 min-w-24" type="submit" form={action.formId}
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
</nav>
