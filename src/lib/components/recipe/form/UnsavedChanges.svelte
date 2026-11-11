<script lang="ts">
    import {beforeNavigate} from '$app/navigation';
    import {tick} from 'svelte';
    import {m} from '$lib/paraglide/messages';

    const {form, saved = false}: {form: HTMLFormElement | undefined; saved?: boolean} = $props();
    let initialValues: string | undefined;

    function values() {
        if (!form) return undefined;
        return JSON.stringify([...new FormData(form)].map(([name, value]) => [
            name,
            value instanceof File ? (value.name ? [value.name, value.size, value.lastModified] : null) : value
        ]));
    }

    function hasChanges() {
        return !saved && initialValues !== undefined && values() !== initialValues;
    }

    $effect(() => {
        if (!form || initialValues !== undefined) return;
        let cancelled = false;
        tick().then(() => {
            if (!cancelled) initialValues = values();
        });
        return () => { cancelled = true; };
    });

    beforeNavigate(({cancel, willUnload}) => {
        if (!willUnload && hasChanges() && !window.confirm(m['recipe.form.unsavedChanges']())) cancel();
    });

    function beforeUnload(event: BeforeUnloadEvent) {
        if (!hasChanges()) return;
        event.preventDefault();
        event.returnValue = '';
    }
</script>

<svelte:window onbeforeunload={beforeUnload}/>
