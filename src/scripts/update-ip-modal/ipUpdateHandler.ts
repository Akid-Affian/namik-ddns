import { ipModalElements, currentField, currentRow, closeIpModal } from "./ipModalManager";

export const updateIpAddresses = async (): Promise<void> => {
    if (currentRow && currentField && ipModalElements.modalIpInput) {
        const domainName =
            currentRow.querySelector<HTMLTableCellElement>(
                "td:nth-child(1)",
            )?.textContent || "";

        const ipAddressInput = currentRow.querySelector<HTMLInputElement>(
            currentField === "ipv4"
                ? "td:nth-child(2) input"
                : "td:nth-child(3) input",
        );

        const ipAddresses = ipModalElements.modalIpInput.value
            .split("\n")
            .map((ip) => ip.trim())
            .filter((ip) => ip !== "");

        if (domainName && ipAddresses.length > 0) {
            const formData = new URLSearchParams();
            formData.append("domainName", domainName);

            if (currentField === "ipv4") {
                formData.append("aRecords", ipAddresses.join(","));
            } else if (currentField === "ipv6") {
                formData.append("aaaaRecords", ipAddresses.join(","));
            }

            try {
                const response = await fetch("/api/user/update-dns-records", {
                    method: "POST",
                    body: formData,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });

                const result = await response.json();

                if (response.ok) {
                    alert(
                        result.message ??
                            "DNS records updated successfully",
                    );
                    if (ipAddressInput) {
                        ipAddressInput.value = ipAddresses.join(", "); // Update the input field in the table
                    }
                } else {
                    alert(result.error ?? "Failed to update DNS records");
                }
            } catch (error) {
                console.error("Error updating DNS records:", error);
                alert("An unexpected error occurred");
            }
        }
    }
    closeIpModal();
};
