<script lang="ts">
    import * as Empty from "$lib/components/ui/empty/index.js";
    import SearchIcon from "@lucide/svelte/icons/search";
</script>

<Empty.Root class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
    <Empty.Header>
        <Empty.Title>404 - Not Found</Empty.Title>
        <Empty.Description>
            The page you're looking for doesn't exist.
        </Empty.Description>
    </Empty.Header>
</Empty.Root>