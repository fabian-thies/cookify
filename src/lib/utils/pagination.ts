import {goto} from "$app/navigation";

export function updatePage(newPage: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(newPage));
    goto(url.toString(), {
        replaceState: true,
        keepFocus: true,
    });
}