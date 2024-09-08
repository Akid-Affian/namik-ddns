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

            if (domainRegex.test(domain)) {

                baseDomainSpans.forEach((span) => {
                    span.textContent = domain;
                });
                errorMessage.textContent = ""; 
            } else {

                errorMessage.textContent =
                    " Invalid domain format. Please enter a valid domain.";
            }
        });
    }
}