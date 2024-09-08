export function initializeAddDomainButton() {
    const addDomainButton = document.getElementById("addDomainButton");

    if (!addDomainButton) return;

    if (addDomainButton.dataset.initialized) return;

    addDomainButton.addEventListener("click", async () => {
        const subdomainInputElement = document.getElementById("subdomainInput") as HTMLInputElement;
        const subdomainInput = subdomainInputElement.value.trim();

        if (!subdomainInput) {
            alert("Please enter a subdomain");
            return;
        }

        try {
            const response = await fetch("/api/add-domain", {
                method: "POST",
                body: new URLSearchParams({ subdomain: subdomainInput }),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const result: { message?: string; error?: string } = await response.json();

            if (response.ok) {
                alert(result.message ?? "Domain added successfully");
                subdomainInputElement.value = ""; 
                // Perform a hard refresh
                location.reload();
            } else {
                alert(result.error ?? "Failed to add domain");
            }
        } catch (error) {
            console.error("Error adding domain:", error);
            alert("An unexpected error occurred");
        }
    });

    addDomainButton.dataset.initialized = "true";
}
