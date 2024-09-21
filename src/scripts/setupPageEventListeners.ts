export function setupEventListeners(): void {
    const baseDomainInput = document.getElementById(
        "baseDomainInput",
    ) as HTMLInputElement | null;
    const baseDomainSpans = document.querySelectorAll(".basedomain");
    const dynamicText = document.querySelector(
        ".dynamic-text",
    ) as HTMLElement | null;

    const domainRegex =
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

    if (baseDomainInput && baseDomainSpans && dynamicText) {

        baseDomainInput.value = "";

        let errorMessage = dynamicText.querySelector(
            ".error-message",
        ) as HTMLSpanElement | null;

        if (!errorMessage) {

            errorMessage = document.createElement("span");
            errorMessage.className = "error-message text-gray-300 ml-2";
            dynamicText.appendChild(errorMessage);
        }

        baseDomainInput.addEventListener("input", (event: Event) => {
            const target = event.target as HTMLInputElement;
            const domain = target.value || "example.com";

            // Check if the domain has only lowercase letters, numbers, and hyphens
            const isValidDomain = domainRegex.test(domain);
            const isLowerCase = domain === domain.toLowerCase();

            if (isValidDomain && isLowerCase) {
                baseDomainSpans.forEach((span) => {
                    span.textContent = domain;
                });
                errorMessage.textContent = ""; // Clear the error message
            } else {
                errorMessage.textContent =
                    " Invalid domain format. Only lowercase letters, numbers, and hyphens are allowed.";
            }
        });
    }
}
