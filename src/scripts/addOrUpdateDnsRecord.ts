export function setupAddOrUpdateDnsRecordButtonListener() {
  document.addEventListener("click", handleAddOrUpdateDnsRecordClick);
}

async function handleAddOrUpdateDnsRecordClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const addDnsRecordButton = target.closest(".add-dns-record-confirm-button");
  if (!addDnsRecordButton) return;

  await handleAddOrUpdateDnsRecord();
}

async function handleAddOrUpdateDnsRecord() {
  const recordNameElement = document.querySelector<HTMLInputElement>('#record-name-input');
  const recordTypeElement = document.querySelector<HTMLSelectElement>('#record-type-select');
  const recordContentElement = document.querySelector<HTMLTextAreaElement>('#record-value-textarea');

  const recordName = recordNameElement?.value.trim();
  const recordType = recordTypeElement?.value.trim(); 
  const recordContent = recordContentElement?.value.trim();

  console.log("Adding/Updating DNS Record:", { recordName, recordType, recordContent });

  const urlParams = new URLSearchParams(window.location.search);
  const zone = urlParams.get('zone');

  if (!zone || !recordName || !recordType || !recordContent) {
    alert("Missing required parameters. Please fill out all fields.");
    return;
  }

  try {
    let processedContent;

    if (["A", "AAAA", "MX", "NS"].includes(recordType)) {
      processedContent = recordContent.split("\n").map(s => s.trim()).join(", ");
    } else if (recordType === "TXT") {
      processedContent = recordContent.replace(/\n/g, " ").trim();
    } else {
      processedContent = recordContent;
    }

    console.log("Processed Content:", processedContent);

    const data = {
      zone: zone,
      name: recordName,
      record_type: recordType, 
      ttl: 3600, 
      content: processedContent,
    };

    const response = await fetch("/api/v2/admin/add-advance-dns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    console.log("Server Response:", result);

    if (response.ok && result.success) {
      alert(result.message || "DNS record added/updated successfully.");
      location.reload();
    } else {
      alert(result.error || "Failed to add/update DNS record.");
    }
  } catch (error) {
    console.error("Error adding/updating DNS record:", error);
    alert("An unexpected error occurred.");
  }
}
