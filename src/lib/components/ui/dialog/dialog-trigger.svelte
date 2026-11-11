<script lang="ts">
    import {Dialog as DialogPrimitive} from "bits-ui";

    let {ref = $bindable(null), onclick, ...restProps}: DialogPrimitive.TriggerProps = $props();
</script>

<DialogPrimitive.Trigger type="button" {...restProps} bind:ref data-slot="dialog-trigger" onclick={(event) => {
    // Safari does not focus buttons on pointer activation; dialogs need a return target.
    event.currentTarget.focus({preventScroll: true});
    onclick?.(event);
}}/>
