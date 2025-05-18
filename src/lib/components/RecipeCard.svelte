<script lang="ts">
    import {UPLOAD_DIR} from "$lib/client/config";

    export let image: string;
    export let title: string;
    export let description: string;
    export let categories: string[] = [];
    export let href: string = '#';
    export let cookTime: number | null = null;
    export let rating: number | null = 0;
</script>

<a href={href}
   class="block relative group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform">
    <div class="relative w-full h-64">
        {#if image}
            <img
                    src={UPLOAD_DIR + image}
                    alt={title}
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
        {:else}
            <div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span class="text-gray-500">No image</span>
            </div>
        {/if}

        {#if cookTime}
            <div class="absolute top-3 right-3 bg-primary backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium shadow-md transition-all duration-300">
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {cookTime} min
                </span>
            </div>
        {/if}

        <div class="absolute top-14 right-3 bg-primary backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium shadow-md transition-all duration-300">
            <span class="flex items-center text-primary-content">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"
                     xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                {rating}
            </span>
        </div>

        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-10 pb-4 px-4 transition-opacity duration-300">
            <h3 class="text-white font-medium text-lg tracking-wide">{title}</h3>
        </div>
    </div>
</a>
