<script lang="ts">
    import RecipeCard from "$lib/components/recipe/RecipeCard.svelte";

    type Props = {
        title: string;
        class?: string;
    }

    const {class: className, title}: Props = $props();
</script>

<div class={`w-full ${className}`}>
    <h2 class="text-2xl font-bold mb-6">
        { title }
    </h2>
    <div class="flex justify-between gap-6">
        <RecipeCard title="Title" description="Description" image="https://picsum.photos/1500/1500" serves={4}
                    cookingTime={20} rating={4.5}/>
        <RecipeCard title="Title" description="Description" image="https://picsum.photos/1500/1500" serves={4}
                    cookingTime={20} rating={4.5}/>
        <RecipeCard title="Title" description="Description" image="https://picsum.photos/1500/1500" serves={4}
                    cookingTime={20} rating={4.5}/>
        <RecipeCard title="Title" description="Description" image="https://picsum.photos/1500/1500" serves={4}
                    cookingTime={20} rating={4.5}/>
    </div>
</div>