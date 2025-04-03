<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { PageServerData } from '../../../.svelte-kit/types/src/routes';

	let { data }: { data: PageServerData } = $props();
</script>

<h1>Hi, {data.user.username}!</h1>
<p>Your user ID is {data.user.id}.</p>
<form method='post' action='?/logout' use:enhance>
	<button>Sign out</button>
</form>
