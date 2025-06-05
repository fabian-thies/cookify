<script lang="ts">
    export let imageFile: File | null = null;
    export let imagePreview: string | null = null;
    export let error: string | undefined = undefined;

    function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            imageFile = input.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                imagePreview = e.target?.result as string;
            };

            reader.readAsDataURL(input.files[0]);
        }
    }
</script>

<div>
    <div
            class="border-2 bg-base-200 border-dashed {error ? 'border-error' : 'border-primary/30'} hover:border-primary hover:bg-primary/5 p-8 rounded-field text-center cursor-pointer transition-all duration-300 relative group h-48 flex flex-col items-center justify-center"
            id="dropzone"
    >
        {#if imagePreview}
            <img src={imagePreview} alt="Recipe preview"
                 class="absolute inset-0 w-full h-full object-cover"/>
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300">
                <p class="text-white text-sm">Press to change image</p>
            </div>
        {:else}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                 stroke-width="1.5"
                 stroke="currentColor"
                 class="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors duration-300">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p class="mt-2 text-sm text-base-content group-hover:text-base-content">Drag image here
                or click to select</p>
        {/if}
        <input accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               name="imageFile"
               onchange={handleImageUpload} type="file"/>
    </div>
    {#if error}
        <div class="text-error text-sm mt-1">{error}</div>
    {/if}
</div>