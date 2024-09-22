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

        const baseDomainSelectElement = document.getElementById("baseDomainSelect") as HTMLSelectElement | null;
        let zone: string | null = null;

        if (baseDomainSelectElement) {
            const selectedZone = baseDomainSelectElement.value.trim();
            const defaultBaseDomain = baseDomainSelectElement.options[0].value.trim(); 

            if (selectedZone !== defaultBaseDomain) {
                zone = selectedZone;
            }
        }

        try {
            const formData = new URLSearchParams();
            formData.append("subdomain", subdomainInput);

            if (zone) {
                formData.append("zone", zone);
            }

            const response = await fetch("/api/domains/add-domain", {
                method: "POST",
                body: formData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const result: { message?: string; error?: string } = await response.json();

            if (response.ok) {
                alert(result.message ?? "Domain added successfully");
                subdomainInputElement.value = ""; 
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
