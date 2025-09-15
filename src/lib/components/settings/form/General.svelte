<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import type {PublicUser} from "$lib/server/db/schema";

    const { user }: { user: PublicUser | null } = $props();
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>Profil</Card.Title>
        <Card.Description>Verwalten Sie Ihre persönlichen Informationen</Card.Description>
    </Card.Header>
    <Card.Content>
        <form>
            <Avatar.Root class="cursor-pointer h-8 w-8 md:h-10 md:w-10">
                <Avatar.Image src={user.avatar}/>
                <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
            </Avatar.Root>
        </form>
    </Card.Content>
    <Card.Footer class="flex-col gap-2">
        <Button type="submit" class="w-full">Login</Button>
    </Card.Footer>
</Card.Root>