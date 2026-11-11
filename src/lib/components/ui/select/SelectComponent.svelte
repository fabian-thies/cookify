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
        id?: string;
        class?: string;
        disabled?: boolean;
        required?: boolean;
    }

    let {
        options,
        value = $bindable(""),
        placeholder = "Select an option",
        groupLabel,
        name,
        id,
        class: className = "w-[180px]",
        disabled = false,
        required = false
    }: Props = $props();

    let invalid = $state(false);
    let triggerRef: HTMLButtonElement | null = $state(null);

    $effect(() => {
        if (value) {
            invalid = false;
        }
    });

    $effect(() => {
        if (!required) return;

        const handleSubmit = (event: Event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !triggerRef || !form.contains(triggerRef)) return;
            if (!value) {
                event.preventDefault();
                event.stopImmediatePropagation();
                invalid = true;
                triggerRef.focus();
            }
        };

        window.addEventListener("submit", handleSubmit, true);
        return () => window.removeEventListener("submit", handleSubmit, true);
    });

    const triggerContent = $derived(
        options.find((option) => option.value === value)?.label ?? placeholder
    );
</script>

 <Select.Root bind:value {disabled} {name} type="single">
    <input type="hidden" name={name} value={value}/>
    <Select.Trigger id={id ?? name} aria-label={groupLabel ?? placeholder} aria-required={required} class={className + " bg-background"} aria-invalid={invalid || undefined} bind:ref={triggerRef}>
        <span class="min-w-0 truncate">{triggerContent}</span>
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
