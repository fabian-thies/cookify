<script lang="ts">
    export let id: string;
    export let name: string;
    export let label: string;
    export let value: string = "";
    export let placeholder: string = "";
    export let error: string | undefined = undefined;
    export let required: boolean = false;
    export let rows: number = 5;

    // Additional classes for the textarea
    export let textareaClass: string = "";
</script>

<fieldset class="bg-base-200 p-6 rounded-field space-y-4">
    <legend class="sr-only">{label}</legend>
    <label class="text-md font-medium text-base-conten" for={id}>{label}</label>

    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}

    <div class="mt-3">
        <textarea
                bind:value={value}
                class="textarea textarea-bordered w-full h-40 resize-y rounded-lg {error ? 'textarea-error' : 'border-base-300'} bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary transition-all {textareaClass}"
                {id}
                {name}
                {placeholder}
                {required}
                rows={rows}
        ></textarea>
    </div>
</fieldset>