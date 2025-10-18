<script lang="ts">
    import LoginForm from "$lib/components/LoginForm.svelte";
    import {Apple} from 'lucide-svelte';
</script>
<div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4 md:px-0">
    <div class="flex w-full max-w-sm flex-col gap-6">
        <a class="flex items-center gap-2 self-center font-medium" href="##">
            <div
                    class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
            >
                <Apple class="size-4"/>
            </div>
            Cookify
        </a>
        <LoginForm isLogin={true}/>
    </div>
</div>
