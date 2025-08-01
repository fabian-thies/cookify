<script lang="ts">
    import * as Select from "$lib/components/ui/select/index.js";

    interface Props {
        options: Record<string, string>;
    }

    let { options }: Props = $props();

    let selected: string = $state("1");
</script>

<Select.Root type="single" bind:value={selected}>
    <Select.Trigger>
        {options[selected]}
    </Select.Trigger>
    <Select.Content>
        {#each options as option, key}
            <Select.Item value={option.value}>{option}</Select.Item>
        { /each }
    </Select.Content>
</Select.Root>
