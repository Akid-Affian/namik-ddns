export function checkNavbarSession() {
    const dashboardLink = document.querySelector('.dashboard-link') as HTMLElement;

    const loginLink = document.querySelector('.login-link') as HTMLElement;
    const registerLink = document.querySelector('.register-link') as HTMLElement;
    const logoutButton = document.querySelector('.logout-button') as HTMLElement;

    if (dashboardLink && loginLink && logoutButton) {
        const cookies = document.cookie.split('; ');
        const sessionCookie = cookies.find(cookie => cookie.startsWith('frontend_session='));

        if (sessionCookie) {
            dashboardLink.style.display = 'flex';
            logoutButton.style.display = 'flex';
            loginLink.style.display = 'none';
            if (registerLink) {
                registerLink.style.display = 'none';
            }
        } else {
            dashboardLink.style.display = 'none';
            logoutButton.style.display = 'none';
            loginLink.style.display = 'flex';
            if (registerLink) {
                registerLink.style.display = 'flex';
            }
        }
    }
}

export function initNavbarSessionCheck() {
    document.addEventListener("astro:page-load", checkNavbarSession);
    document.addEventListener("astro:after-swap", checkNavbarSession);
}
