<script lang="ts">
    import {UPLOAD_DIR} from "$lib/client/config";
    import type {Recipe} from "$lib/server/db/schema";

    let {data} = $props();

    const recipe: Recipe = data.recipe;
</script>

<article class="max-w-[120rem] mx-auto p-6">
    <div class="p-8 grid grid-cols-4 gap-6">
        <div class="bg-base-200 p-6 rounded-md space-y-4 col-span-1">
            <img alt={recipe.title}
                 class="w-full max object-cover" src={UPLOAD_DIR + recipe.imageUrl}>
        </div>
        <div class="bg-base-200 p-6 rounded-md space-y-4 col-span-3">
        </div>
    </div>
</article>
