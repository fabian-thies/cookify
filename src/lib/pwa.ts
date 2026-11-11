export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & {standalone?: boolean}).standalone === true;
}

export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', {scope: '/'}).catch((error) => {
            console.error('Service worker registration failed', error);
        });
    }, {once: true});
}

export function clearOfflineCaches(): void {
    if (!('serviceWorker' in navigator)) {
        return;
    }
    navigator.serviceWorker.controller?.postMessage({type: 'CLEAR_CACHES'});
}
