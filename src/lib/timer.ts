// Safari can suspend interval callbacks while the page is in the background.
export function remainingSeconds(deadline: number, now = Date.now()): number {
    return Math.max(0, Math.ceil((deadline - now) / 1000));
}
