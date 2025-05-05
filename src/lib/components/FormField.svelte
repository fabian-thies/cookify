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
    export let unit: string = "";

    // Additional classes for the input
    export let inputClass: string = "";
</script>

<fieldset class="space-y-2">
    <legend class="sr-only">{label}</legend>
    <label class="text-md font-medium text-base-content" for={id}>{label}</label>

    <div class="relative w-full mt-1">
        <input
                bind:value={value}
                class="[&::-webkit-inner-spin-button]:appearance-none border p-2 rounded {fullWidth ? 'w-full' : ''} rounded-lg pr-18 {error ? 'input-error' : 'border-base-300'} bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all {inputClass}"
                {id}
                {min}
                {name}
                {placeholder}
                {required}
                {type}
        />
        {#if unit}
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-base-content text-sm pointer-events-none">
            {unit}
        </span>
        {/if}
    </div>

    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}
</fieldset>
