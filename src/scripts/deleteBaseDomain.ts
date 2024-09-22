// Function to set up event delegation for delete base domain modal
export function setupDeleteBaseDomainButtonListener() {
    document.addEventListener("click", handleDeleteBaseDomainClick);
  }
  
  // Event handler function
  async function handleDeleteBaseDomainClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
  
    // Check if the clicked element is the delete confirmation button in the modal
    const deleteBaseDomainButton = target.closest(".delete-base-domain-modal-confirm-button");
  
    if (!deleteBaseDomainButton) return;
  
    // Proceed with the delete handler logic
    await handleDeleteBaseDomain();
  }
  
  // Your delete domain handler logic
  async function handleDeleteBaseDomain() {
    const domainInputElement = document.querySelector(".deleteDomainInput") as HTMLInputElement;
    const domainInput = domainInputElement.value.trim();
  
    if (!domainInput) {
      alert("Please enter a base domain to delete.");
      return;
    }
  
    // Prompt the user to type 'confirm' to proceed with deletion
    const userConfirmation = window.prompt(
      "Please type 'confirm' to proceed with deletion. This action cannot be undone."
    );
  
    if (!userConfirmation || userConfirmation.toLowerCase() !== "confirm") {
      alert("Deletion cancelled.");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("domain_name", domainInput);
  
      const response = await fetch("/api/v2/admin/delete-additional-base-domains", {
        method: "POST",
        body: formData,
      });
  
      const result: { success?: boolean; message?: string; error?: string } = await response.json();
  
      if (response.ok) {
        alert(result.message ?? "Base domain deleted successfully.");
        domainInputElement.value = ""; // Clear the domain input
        location.reload(); // Perform a hard refresh
      } else {
        alert(result.error ?? "Failed to delete base domain.");
      }
    } catch (error) {
      console.error("Error deleting base domain:", error);
      alert("An unexpected error occurred.");
    }
  }
  