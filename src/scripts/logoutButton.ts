export function initLogoutButton() {
    const logoutButton = document.querySelector(
        "[data-logout]",
    ) as HTMLButtonElement;
    if (
        logoutButton &&
        !logoutButton.hasAttribute("data-listener-attached")
    ) {
        let isProcessing = false;
        logoutButton.addEventListener("click", async () => {
            if (isProcessing) return;
            isProcessing = true;
            logoutButton.disabled = true;
            try {
                const response = await fetch("/api/user/logout", {
                    method: "POST",
                });
                if (response.ok) {
                    window.location.href = "/";
                } else {
                    alert("Logout failed. Please try again.");
                    window.location.href = "/";
                }
            } catch (error) {
                console.error("Error during logout:", error);
                alert("An error occurred. Please try again.");
            } finally {
                logoutButton.disabled = false;
                isProcessing = false;
            }
        });
        logoutButton.setAttribute("data-listener-attached", "true");
    }
}