<script lang="ts">
    export let id: string;
    export let name: string;
    export let label: string;
    export let value: string | number = "";
    export let placeholder: string = "";
    export let type: string = "text";
    export let error: string | undefined = undefined;
    export let min: number | undefined = undefined;
    export let required: boolean = false;
    export let fullWidth: boolean = true;

    // Additional classes for the input
    export let inputClass: string = "";
</script>

<fieldset class="space-y-2">
    <legend class="sr-only">{label}</legend>
    <label class="text-sm font-medium text-base-content/70" for={id}>{label}</label>
    <input
            bind:value={value}
            class="input input-bordered {fullWidth ? 'w-full' : ''} rounded-lg {error ? 'input-error' : 'border-base-300'} bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all {inputClass}"
            {id}
            {min}
            {name}
            {placeholder}
            {required}
            {type}
    />
    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}
</fieldset>