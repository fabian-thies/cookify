<script lang="ts">
    import * as Select from "$lib/components/ui/select/index.js";

    let selected: string = $state("1");

    const options: Record<string, string> = {
        "1": "Alle Kategorien",
        "2": "Light",
        "3": "Dark",
        "4": "System"
    };
</script>

<Select.Root type="single" bind:value={selected}>
    <Select.Trigger class="w-[180px]">
        {options[selected]}
    </Select.Trigger>
    <Select.Content>
        <Select.Item value="1">Alle Kategorien</Select.Item>
        <Select.Item value="2">Light</Select.Item>
        <Select.Item value="3">Dark</Select.Item>
        <Select.Item value="4">System</Select.Item>
    </Select.Content>
</Select.Root>
