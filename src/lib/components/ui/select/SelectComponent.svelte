<script lang="ts">
    import * as Select from "$lib/components/ui/select/index.js";

    interface Option {
        value: string;
        label: string;
    }

    interface Props {
        options: Option[];
        value?: string;
        placeholder?: string;
        groupLabel?: string;
        name?: string;
        class?: string;
        disabled?: boolean;
        id?: string;
    }

    let {
        options,
        value = $bindable(""),
        placeholder = "Select an option",
        groupLabel,
        name,
        class: className = "w-[180px]",
        disabled = false,
        id
    }: Props = $props();

    const triggerContent = $derived(
        options.find((option) => option.value === value)?.label ?? placeholder
    );
</script>

<Select.Root type="single" {name} bind:value {disabled} {id}>
    <Select.Trigger class={className + "bg-primary text-primary-foreground"}>
        {triggerContent}
    </Select.Trigger>
    <Select.Content>
        <Select.Group>
            {#if groupLabel}
                <Select.Label>{groupLabel}</Select.Label>
            {/if}
            {#each options as option (option.value)}
                <Select.Item
                        value={option.value}
                        label={option.label}
                >
                    {option.label}
                </Select.Item>
            {/each}
        </Select.Group>
    </Select.Content>
</Select.Root>