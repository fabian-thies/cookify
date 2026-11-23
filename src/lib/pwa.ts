import {version} from '$app/environment';

export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & {standalone?: boolean}).standalone === true;
}

export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
        return;
    }

    function register() {
        navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`, {
            scope: '/',
            updateViaCache: 'none'
        }).catch((error) => {
            console.error('Service worker registration failed', error);
        });
    }

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, {once: true});
    }
}
