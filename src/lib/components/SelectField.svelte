<script lang="ts">
    export let id: string;
    export let name: string;
    export let label: string;
    export let value: string | number = "";
    export let options: { value: string | number; label: string }[] = [];
    export let error: string | undefined = undefined;
    export let required: boolean = false;
    export let fullWidth: boolean = true;

    // Additional classes for the select
    export let selectClass: string = "";
</script>

<fieldset class="space-y-2">
    <legend class="sr-only">{label}</legend>
    <label class="text-md font-medium text-base-content" for={id}>{label}</label>
    <select
            bind:value={value}
            class="select select-bordered mt-1 {fullWidth ? 'w-full' : ''} rounded-lg {error ? 'select-error' : 'border-base-300'} bg-base-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all {selectClass}"
            {id}
            {name}
            {required}
    >
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}
</fieldset>