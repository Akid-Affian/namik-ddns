export let ipModalElements: {
    editIpModal: HTMLElement | null;
    modalIpInput: HTMLTextAreaElement | null;
    modalTitle: HTMLHeadingElement | null;
    updateIpButton: HTMLButtonElement | null;
    closeModalButton: HTMLButtonElement | null;
    getMyIpButton: HTMLButtonElement | null;
};

export let currentField: "ipv4" | "ipv6" = "ipv4";
export let currentRow: HTMLTableRowElement | null = null;

export const initializeIpModalElements = (): void => {
    ipModalElements = {
        editIpModal: document.getElementById("editIpModal"),
        modalIpInput: document.getElementById(
            "modalIpInput",
        ) as HTMLTextAreaElement,
        modalTitle: document.getElementById(
            "modalTitle",
        ) as HTMLHeadingElement,
        updateIpButton: document.getElementById(
            "updateIpButton",
        ) as HTMLButtonElement,
        closeModalButton: document.getElementById(
            "closeModalButton",
        ) as HTMLButtonElement,
        getMyIpButton: document.getElementById(
            "getMyIpButton",
        ) as HTMLButtonElement,
    };
};

export const toggleIpModalVisibility = (visible: boolean): void => {
    if (ipModalElements.editIpModal) {
        ipModalElements.editIpModal.classList.toggle("invisible", !visible);
        ipModalElements.editIpModal.classList.toggle("opacity-0", !visible);
        ipModalElements.editIpModal.classList.toggle("opacity-100", visible);

        const inputs = document.querySelectorAll<HTMLInputElement>(
            ".domain-container input",
        );
        inputs.forEach((input) => {
            input.disabled = visible;
        });
    }
};

export const openIpModal = (
    field: "ipv4" | "ipv6",
    row: HTMLTableRowElement,
): void => {
    currentField = field;
    currentRow = row;

    const domainName =
        row.querySelector<HTMLTableCellElement>("td:nth-child(1)")
            ?.textContent || "";
    const ipAddressInput = row.querySelector<HTMLInputElement>(
        field === "ipv4"
            ? "td:nth-child(2) input"
            : "td:nth-child(3) input",
    );

    const ipAddresses =
        ipAddressInput?.value
            .split(",")
            .map((ip) => ip.trim())
            .join("\n") || "";

    if (ipModalElements.modalTitle) {
        ipModalElements.modalTitle.textContent = `Edit ${field.toUpperCase()} Address for ${domainName}`;
    }
    if (ipModalElements.modalIpInput) {
        ipModalElements.modalIpInput.value = ipAddresses;
    }

    toggleIpModalVisibility(true);
};

export const closeIpModal = (): void => {
    toggleIpModalVisibility(false);
    currentRow = null;
};

export const fetchUserIpAddress = async (): Promise<void> => {
    if (!ipModalElements.getMyIpButton) return;

    const spinner = ipModalElements.getMyIpButton.querySelector("svg");
    const buttonText = ipModalElements.getMyIpButton.querySelector("span");

    if (spinner && buttonText) {
        spinner.classList.remove("hidden"); // Show spinner
        buttonText.classList.add("ml-2"); // Add margin when spinner is visible
    }

    try {
        const ipv4Response = await fetch("https://api.ipify.org?format=json");
        const ipv6Response = await fetch("https://api6.ipify.org?format=json");

        const ipv4Data = await ipv4Response.json();
        const ipv6Data = await ipv6Response.json();

        if (ipModalElements.modalIpInput) {
            if (currentField === "ipv4" && ipv4Data && ipv4Data.ip) {
                ipModalElements.modalIpInput.value = ipv4Data.ip;
            } else if (currentField === "ipv6" && ipv6Data && ipv6Data.ip) {
                ipModalElements.modalIpInput.value = ipv6Data.ip;
            }
        }
    } catch (error) {
        console.error("Error fetching IP address:", error);
        alert("Failed to fetch IP address. Please try again later.");
    } finally {
        if (spinner && buttonText) {
            spinner.classList.add("hidden"); // Hide spinner
            buttonText.classList.remove("ml-2"); // Remove margin when spinner is hidden
        }
    }
};


