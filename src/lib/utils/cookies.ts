export function getCookieValue(cookies: string, name: string): string | undefined {
    const cookie = cookies
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.split("=")[1]) : undefined;
}
