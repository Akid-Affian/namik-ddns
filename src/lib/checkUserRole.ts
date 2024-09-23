import { getCookieValue } from "./utils/cookies";

export async function getUserRole(Astro: any): Promise<string | null> {
    const cookies = Astro.request.headers.get("cookie") || "";
    const authToken = getCookieValue(cookies, "auth_token");

    if (!authToken) return null;

    const baseUrl = new URL(Astro.request.url).origin;
    const apiUrl = `${baseUrl}/api/utils/user-role`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                cookie: cookies,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.role;
        }
    } catch (error) {
        console.error('Error fetching user role:', error);
    }

    return null;
}
