<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: { data: PageServerData } = $props();
</script>

<form method='post' action='?/logout' use:enhance>
	<button>{ m.logout() }</button>
</form>
