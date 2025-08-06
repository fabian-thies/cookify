<script lang="ts">
    import SelectComponent from "$lib/components/ui/select/SelectComponent.svelte";

    const categories = [
        { value: "Hauptgericht", label: "Hauptgericht" },
        { value: "Dessert", label: "Dessert" },
        { value: "Vorspeise", label: "Vorspeise" }
    ];
</script>

<SelectComponent
        options={categories}
        placeholder="Select a category"
        groupLabel="Kategorien"
        name="category"
        class="w-[200px]"
/>

<SelectComponent
        options={categories}
        placeholder="Select a category"
        groupLabel="Kategorien"
        name="category"
        class="w-[200px]"
/>

<SelectComponent
        options={categories}
        placeholder="Select a category"
        groupLabel="Kategorien"
        name="category"
        class="w-[200px]"
/>
