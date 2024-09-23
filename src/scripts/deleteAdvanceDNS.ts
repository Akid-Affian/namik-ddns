export function setupDeleteDnsRecordButtonListener() {
  document.addEventListener("click", handleDeleteDnsRecordClick);
}

async function handleDeleteDnsRecordClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const deleteDnsRecordButton = target.closest(".delete-dns-record-confirm-button");

  if (!deleteDnsRecordButton) return;

  const userConfirmation = window.prompt('Type "Confirm" to proceed with DNS record deletion (case insensitive).');

  if (!userConfirmation || userConfirmation.trim().toLowerCase() !== "confirm") {
    alert("Deletion cancelled. You must type 'Confirm' to delete the DNS record.");
    return;
  }

  await handleDeleteDnsRecord();
}

async function handleDeleteDnsRecord() {

  const recordNameElement = document.getElementById("delete-record-name");
  const recordTypeElement = document.getElementById("delete-record-type");
  const recordContentElement = document.getElementById("delete-record-content");
  const recordTtlElement = document.getElementById("delete-record-ttl");

  const recordName = recordNameElement?.textContent?.trim();
  const recordType = recordTypeElement?.textContent?.trim();
  const recordContents = recordContentElement?.textContent?.split(",").map(s => s.trim()) || [];
  const recordTtl = parseInt(recordTtlElement?.textContent?.trim() || "0", 10);

  const urlParams = new URLSearchParams(window.location.search);
  const zone = urlParams.get('zone');

  if (!zone) {
    alert("No zone selected. Cannot delete DNS record.");
    return;
  }

  try {

    const data = {
      zone: zone,
      name: recordName,
      type: recordType,
      contents: recordContents,
      ttl: recordTtl,
    };

    const response = await fetch("/api/v2/admin/delete-advance-dns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert(result.message || "DNS record(s) deleted successfully.");
      location.reload(); 
    } else {
      alert(result.error || "Failed to delete DNS record.");
    }
  } catch (error) {
    console.error("Error deleting DNS record:", error);
    alert("An unexpected error occurred.");
  }
}