export function setupDeleteDnsRecordButtonListener() {

  document.addEventListener("click", handleDeleteDnsRecordClick);

  document.addEventListener("click", handleOpenDeleteModalClick);
}

async function handleDeleteDnsRecordClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const deleteConfirmButton = target.closest(".delete-dns-record-confirm-button");

  if (!deleteConfirmButton) return;

  const userConfirmation = window.prompt('Type "Confirm" to proceed with DNS record deletion (case insensitive).');

  if (!userConfirmation || userConfirmation.trim().toLowerCase() !== "confirm") {
    alert("Deletion cancelled. You must type 'Confirm' to delete the DNS record.");
    return;
  }

  await handleDeleteDnsRecord();
}

async function handleDeleteDnsRecord() {
  const recordIdsElement = document.getElementById("delete-record-ids") as HTMLInputElement | null;
  const recordNameElement = document.getElementById("delete-record-name");
  const recordTypeElement = document.getElementById("delete-record-type");
  const recordContentElement = document.getElementById("delete-record-content");
  const recordTtlElement = document.getElementById("delete-record-ttl");

  const recordIdsString = recordIdsElement?.value || '';
  const recordIds = recordIdsString.split(',').map(idStr => parseInt(idStr.trim(), 10)).filter(id => !isNaN(id));

  const recordName = recordNameElement?.textContent?.trim();
  const recordType = recordTypeElement?.textContent?.trim();
  const recordContent = recordContentElement?.textContent?.trim();
  const recordTtl = parseInt(recordTtlElement?.textContent?.trim() || "0", 10);

  const urlParams = new URLSearchParams(window.location.search);
  const zone = urlParams.get('zone');

  if (!zone) {
    alert("No zone selected. Cannot delete DNS record.");
    return;
  }

  try {
    const data: any = {
      zone: zone,
      name: recordName,
      type: recordType,
      ttl: recordTtl,
    };

    if (recordIds.length > 0) {
      data.ids = recordIds;
    } else {

      if (recordContent) {
        data.content = recordContent;
      }

    }

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

function handleOpenDeleteModalClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const deleteButton = target.closest('[data-open-modal="delete-advance-dns-modal"]');

  if (!deleteButton) return;

  const recordIds = deleteButton.getAttribute('data-record-ids'); 
  const recordName = deleteButton.getAttribute('data-record-name');
  const recordType = deleteButton.getAttribute('data-record-type');
  const recordContent = deleteButton.getAttribute('data-record-content');
  const recordTtl = deleteButton.getAttribute('data-record-ttl');

  const recordNameElement = document.getElementById("delete-record-name");
  const recordTypeElement = document.getElementById("delete-record-type");
  const recordContentElement = document.getElementById("delete-record-content");
  const recordTtlElement = document.getElementById("delete-record-ttl");
  const recordIdsInput = document.getElementById("delete-record-ids") as HTMLInputElement | null;

  if (recordNameElement) recordNameElement.textContent = recordName || '';
  if (recordTypeElement) recordTypeElement.textContent = recordType || '';
  if (recordContentElement) recordContentElement.textContent = recordContent || '';
  if (recordTtlElement) recordTtlElement.textContent = recordTtl || '';
  if (recordIdsInput) recordIdsInput.value = recordIds || '';
}