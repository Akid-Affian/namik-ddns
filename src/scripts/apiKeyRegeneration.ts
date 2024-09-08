import { format } from "timeago.js";

let isEventListenerAttached = false;

export function initApiKeyRegeneration() {
    const regenerateButton = document.getElementById(
        "regenerateApiKey",
    ) as HTMLButtonElement | null;
    const apiKeyDisplay = document.getElementById(
        "apiKeyDisplay",
    ) as HTMLElement | null;
    const apiKeyCreatedAtDisplay = document.getElementById(
        "apiKeyCreatedAt",
    ) as HTMLElement | null;

    if (!regenerateButton || !apiKeyDisplay || !apiKeyCreatedAtDisplay) return;

    if (!isEventListenerAttached) {
        const handleRegenerateApiKey = async () => {
            if (!regenerateButton || !apiKeyDisplay || !apiKeyCreatedAtDisplay) return;

            try {
                regenerateButton.disabled = true;
                regenerateButton.classList.add("opacity-50");

                const response = await fetch("/api/regenerate-key", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "same-origin",
                });

                if (!response.ok) {
                    throw new Error("Failed to regenerate API key");
                }

                const data = await response.json();

                if (data.apiKey) {
                    apiKeyDisplay.textContent = data.apiKey;

                    const newApiKeyCreatedAt = format(new Date());
                    apiKeyCreatedAtDisplay.textContent = newApiKeyCreatedAt;

                    alert("API key regenerated successfully!");
                } else {
                    throw new Error("No API key returned");
                }
            } catch (error) {
                console.error("Error regenerating API key:", error);
                alert("Failed to regenerate API key. Please try again.");
            } finally {
                regenerateButton.disabled = false;
                regenerateButton.classList.remove("opacity-50");
            }
        };

        regenerateButton.addEventListener("click", handleRegenerateApiKey);

        isEventListenerAttached = true;
    }
}

export function resetEventListenerFlag() {
    isEventListenerAttached = false;
}
