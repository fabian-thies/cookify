<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {Textarea} from "$lib/components/ui/textarea/index.js";
    import {Spinner} from "$lib/components/ui/spinner/index.js";
    import {m} from "$lib/paraglide/messages";
    import {toast} from "svelte-sonner";
    import {Sparkles} from "lucide-svelte";
    import type {AiRecipeResult} from "$lib/types/ai";

    let {
        recipe,
        onApply
    }: {
        recipe: AiRecipeResult;
        onApply: (recipe: AiRecipeResult) => void | Promise<void>;
    } = $props();

    let open = $state(false);
    let instruction = $state("");
    let loading = $state(false);
    let error = $state<string | null>(null);
    let controller: AbortController | null = null;

    function numberOrNull(value: FormDataEntryValue | null): number | null {
        const raw = String(value ?? "").trim();
        if (!raw) return null;
        const number = Number(raw);
        return Number.isFinite(number) ? Math.round(number) : null;
    }

    function readCurrentRecipe(): AiRecipeResult {
        const form = document.querySelector('form[enctype="multipart/form-data"]') as HTMLFormElement | null;
        if (!form) return recipe;

        const data = new FormData(form);
        const text = (name: string) => String(data.get(name) ?? "").trim();
        const strings = (name: string) => data.getAll(name).map((value) => String(value).trim()).filter(Boolean);

        const names = data.getAll("ingredients_name[]");
        const amounts = data.getAll("ingredients_amount[]");
        const units = data.getAll("ingredients_unit[]");
        const ingredients = names
            .map((name, index) => ({
                name: String(name).trim(),
                amount: Number(amounts[index]) || 1,
                unit: String(units[index] ?? "").trim()
            }))
            .filter((ingredient) => ingredient.name);

        const difficultyRaw = text("difficulty");
        const difficulty = ["easy", "medium", "hard"].includes(difficultyRaw)
            ? difficultyRaw as AiRecipeResult["difficulty"]
            : recipe.difficulty;

        return {
            title: text("title"),
            description: text("description"),
            image: recipe.image,
            cookTime: Number(text("cookTime")) || recipe.cookTime,
            servings: Number(text("servings")) || recipe.servings,
            difficulty,
            ingredients,
            steps: strings("instructions_description[]"),
            tags: strings("tags[]"),
            tips: strings("tips[]"),
            nutrition: {
                calories: numberOrNull(data.get("calories")),
                protein: numberOrNull(data.get("protein")),
                carbs: numberOrNull(data.get("carbs")),
                fat: numberOrNull(data.get("fat")),
                fiber: numberOrNull(data.get("fiber"))
            },
            sourceUrl: recipe.sourceUrl
        };
    }

    async function handleApply() {
        if (!instruction.trim()) {
            error = m["recipe.ai.editError"]();
            return;
        }

        const current = readCurrentRecipe();
        const formData = new FormData();
        formData.append("action", "adjust");
        formData.append("instruction", instruction.trim());
        formData.append("recipe", JSON.stringify(current));

        loading = true;
        error = null;
        controller = new AbortController();

        try {
            const response = await fetch("/api/ai/recipe", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error("AI request failed");
            }

            const result = await response.json() as AiRecipeResult;
            result.nutrition = {
                calories: result.nutrition?.calories ?? current.nutrition?.calories ?? null,
                protein: result.nutrition?.protein ?? current.nutrition?.protein ?? null,
                carbs: result.nutrition?.carbs ?? current.nutrition?.carbs ?? null,
                fat: result.nutrition?.fat ?? current.nutrition?.fat ?? null,
                fiber: result.nutrition?.fiber ?? current.nutrition?.fiber ?? null
            };

            await onApply(result);
            open = false;
            instruction = "";
            toast.success(m["recipe.ai.applied"]());
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                error = m["recipe.ai.editError"]();
            }
        } finally {
            loading = false;
            controller = null;
        }
    }
</script>

<Dialog.Root bind:open onOpenChange={(value) => {
    if (!value) {
        controller?.abort();
        error = null;
    }
}}>
    <Dialog.Trigger class={buttonVariants({variant: "outline"}) + " w-full gap-2"}>
            <Sparkles size={16}/>
            {m["recipe.ai.editButton"]()}
    </Dialog.Trigger>
    <Dialog.Content class="sm:max-w-[550px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Sparkles size={18}/>
                {m["recipe.ai.editTitle"]()}
            </Dialog.Title>
            <Dialog.Description>{m["recipe.ai.editDescription"]()}</Dialog.Description>
        </Dialog.Header>

        <div class="flex flex-col gap-1.5 py-4">
            <Label for="ai-edit-instruction">{m["recipe.ai.instructionLabel"]()}</Label>
            <Textarea
                id="ai-edit-instruction"
                bind:value={instruction}
                placeholder={m["recipe.ai.instructionPlaceholder"]()}
                disabled={loading}
                rows={4}
            />
        </div>

        {#if error}
            <p role="alert" class="text-sm text-destructive">{error}</p>
        {/if}

        <Dialog.Footer>
            <Button variant="outline" onclick={() => open = false} disabled={loading} type="button">
                {m["actions.cancel"]()}
            </Button>
            <Button onclick={handleApply} disabled={loading} type="button" class="gap-2">
                {#if loading}
                    <Spinner/>
                    {m["recipe.ai.applying"]()}
                {:else}
                    <Sparkles size={16}/>
                    {m["recipe.ai.apply"]()}
                {/if}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
