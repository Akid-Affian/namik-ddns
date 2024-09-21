// Function to set up event delegation
export function setupAddBaseDomainButtonListener() {
    document.addEventListener("click", handleAddBaseDomainClick);
  }
  
  // Event handler function
  async function handleAddBaseDomainClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
  
    // Check if the clicked element has or is contained within the button with the class name
    const addBaseDomainButton = target.closest(".add-base-domain-modal-confirm-button");
  
    if (!addBaseDomainButton) return;
  
    // Proceed with your click handler logic
    await handleAddBaseDomain();
  }
  
  // Your existing click handler logic
  async function handleAddBaseDomain() {
    const domainInputElement = document.querySelector(".domainInput") as HTMLInputElement;
    const domainInput = domainInputElement.value.trim();
  
    // Get the nameserver textarea element
    const nameserverTextarea = document.querySelector(".nameserverTextarea") as HTMLTextAreaElement;
  
    // Process the nameservers from the textarea
    const nameservers = nameserverTextarea.value
      .split('\n') // Split the textarea value by newlines
      .map((line) => line.trim())
      .filter((value) => value !== "");
  
    if (!domainInput) {
      alert("Please enter a domain name");
      return;
    }
  
    if (nameservers.length === 0 || nameservers.length > 6) {
      alert("You must provide at least one nameserver and no more than six");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("domain_name", domainInput);
      nameservers.forEach((ns) => {
        formData.append(`nameservers[]`, ns);
      });
  
      const response = await fetch("/api/v2/admin/add-additional-base-domains", {
        method: "POST",
        body: formData,
      });
  
      const result: { success?: boolean; message?: string; error?: string } = await response.json();
  
      if (response.ok) {
        alert(result.message ?? "Base domain added successfully");
        domainInputElement.value = ""; // Clear the domain input
        nameserverTextarea.value = ""; // Clear the nameserver textarea
        location.reload(); // Perform a hard refresh
      } else {
        alert(result.error ?? "Failed to add base domain");
      }
    } catch (error) {
      console.error("Error adding base domain:", error);
      alert("An unexpected error occurred");
    }
  }
  