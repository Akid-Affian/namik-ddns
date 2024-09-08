function getCookie(name: string): string | undefined {
    const cookieString = document.cookie;
    const cookies = cookieString.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
        if (cookieName === name) {
            return cookieValue;
        }
    }
    return undefined;
}

export function checkAndRedirectIfNotLoggedIn() {
    const sessionCookie = getCookie('frontend_session');
    if (sessionCookie === undefined) {
        window.location.href = '/';
    }
}

export function initRedirectIfNotLoggedIn() {
    document.addEventListener("astro:page-load", checkAndRedirectIfNotLoggedIn);
    document.addEventListener("astro:after-swap", checkAndRedirectIfNotLoggedIn);
}