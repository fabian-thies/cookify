<script lang="ts">
    import {Button} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import type {PublicUser} from "$lib/server/db/schema";
    import {Camera} from "lucide-svelte";

    const {user}: { user: PublicUser } = $props();
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title>Profil</Card.Title>
        <Card.Description>Verwalten Sie Ihre persönlichen Informationen</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-6">
                <Avatar.Root class="cursor-pointer h-8 w-8 md:h-10 md:w-10 lg:h-24 lg:w-24">
                    <Avatar.Image src={user.avatar}/>
                    <Avatar.Fallback>{user.username.slice(0, 2)}</Avatar.Fallback>
                </Avatar.Root>
                <Button variant="outline" class="flex items-center gap-2">
                    <Camera/>
                    Avatar ändern
                </Button>
            </div>
            <div class="flex w-full flex-col gap-1.5">
                <Label for="username">Username</Label>
                <Input
                        type="text"
                        id="username"
                        name="username"
                        placeholder="z.B. MaxMustermann"
                        required
                        value={user.username}
                />
            </div>
            <div class="flex w-full flex-col gap-1.5">
                <Label for="email">E-Mail</Label>
                <Input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="z.B. max@example.com"
                        required
                        value={user.email}
                />
            </div>
        </div>
    </Card.Content>
    <Card.Footer class="flex-col gap-2 items-start">
        <Button type="submit">Profil speichern</Button>
    </Card.Footer>
</Card.Root>