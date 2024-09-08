import { initializeIpModalElements, openIpModal, closeIpModal, ipModalElements, fetchUserIpAddress } from "./ipModalManager";
import { updateIpAddresses } from "./ipUpdateHandler";

export let isInitialized = false; 

export const bindIpModalEvents = (): void => {
    document
        .querySelector(".domain-container")
        ?.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "INPUT") {
                const row = target.closest<HTMLTableRowElement>("tr");
                if (row) {
                    const parentCell =
                        target.parentElement as HTMLTableCellElement;
                    if (parentCell.cellIndex === 1) {
                        openIpModal("ipv4", row);
                    } else if (parentCell.cellIndex === 2) {
                        openIpModal("ipv6", row);
                    }
                }
            }
        });

    ipModalElements.updateIpButton?.addEventListener("click", updateIpAddresses);
    ipModalElements.closeModalButton?.addEventListener("click", closeIpModal);
    ipModalElements.getMyIpButton?.addEventListener("click", fetchUserIpAddress); // Bind the Get My IP button

    window.addEventListener("click", (e: MouseEvent): void => {
        if (e.target === ipModalElements.editIpModal) {
            closeIpModal();
        }
    });
};

export const initIpModalFunctionality = (): void => {
    if (isInitialized) return; 

    initializeIpModalElements();
    bindIpModalEvents();

    isInitialized = true; 
};

export const cleanUpIpModalFunctionality = (): void => {
    if (ipModalElements) {
        ipModalElements.updateIpButton?.removeEventListener(
            "click",
            updateIpAddresses,
        );
        ipModalElements.closeModalButton?.removeEventListener(
            "click",
            closeIpModal,
        );
        ipModalElements.getMyIpButton?.removeEventListener(
            "click",
            fetchUserIpAddress,
        );
        isInitialized = false; 
    }
};
