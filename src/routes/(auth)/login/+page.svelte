<script lang='ts'>
    import {enhance} from '$app/forms';
    import type {ActionData} from "./$types";

    let {form}: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-base-300 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-base-100 p-8 rounded-box shadow-md">
        <div class="text-center">
            <h2 class="mt-6 text-3xl font-extrabold text-base-content">
                Login
            </h2>
            <p class="mt-2 text-sm text-base-content">
                Login or register to access your account.
            </p>
        </div>
        <form action='?/login' class="mt-8 space-y-6" method='post' use:enhance>
            <div class="rounded-field space-y-4">
                <div>
                    <label class="block text-sm font-medium text-base-content" for="username">Username</label>
                    <input
                            autocomplete="username"
                            class="mt-1 appearance-none rounded-field relative block w-full px-3 py-2 bg-base-300 border border-base-100 placeholder-gray-500 text-base-content focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            id="username"
                            name="username"
                            placeholder="Username"
                            required
                            type="text"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-base-content" for="password">Password</label>
                    <input
                            autocomplete="current-password"
                            class="mt-1 appearance-none rounded-field relative block w-full px-3 py-2 bg-base-300 border border-base-100 placeholder-gray-500 text-base-content focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            id="password"
                            name="password"
                            placeholder="Password"
                            required
                            type="password"
                    />
                </div>
            </div>

            {#if form?.message}
                <div class="rounded-field bg-red-50 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                 fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-700">{form.message}</p>
                        </div>
                    </div>
                </div>
            {/if}

            <div class="flex items-center justify-between gap-4">
                <button
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent cursor-pointer text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        type="submit"
                >
                    Sign in
                </button>
                <button
                        class="group relative w-full flex justify-center py-2 px-4 border border-indigo-600 cursor-pointer text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        formaction='?/register'
                >
                    Register
                </button>
            </div>
        </form>
    </div>
</div>
