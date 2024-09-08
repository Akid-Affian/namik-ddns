export function handleDeleteButtonClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest(
        ".delete-domain-button",
    ) as HTMLElement | null;
    if (button) {
        const domainId = button.getAttribute("data-domain-id");
        if (domainId) {
            const userInput = prompt(
                "Type 'CONFIRM' to delete this domain:",
            );
            if (userInput && userInput.toUpperCase() === "CONFIRM") {
                deleteDomain(domainId);
            } else {
                alert(
                    "Deletion cancelled. You must type 'CONFIRM' to delete the domain.",
                );
            }
        }
    }
}

async function deleteDomain(domainId: string): Promise<void> {
    try {
        const formData = new URLSearchParams();
        formData.append("domainId", domainId);
        const response = await fetch("/api/delete-domain", {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message ?? "Domain deleted successfully");
            location.reload();
        } else {
            alert(result.error ?? "Failed to delete domain");
        }
    } catch (error) {
        console.error("Error deleting domain:", error);
        alert("An unexpected error occurred");
    }
}