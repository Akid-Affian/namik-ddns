import { 
    initializeModifyUserRoleModalElements, 
    openModifyUserRoleModal, 
    closeModifyUserRoleModal, 
    modifyUserRoleModalElements 
} from "./modifyUserRoleModalManager";

import { modifyUserRole } from "./modifyUserRoleHandler";

export let isInitialized = false; // Guard to prevent re-initialization

export const bindModifyUserRoleModalEvents = (): void => {
    if (!modifyUserRoleModalElements.confirmModifyUserRoleButton || !modifyUserRoleModalElements.cancelModifyUserRoleButton) {
        return;
    }

    const modifyUserRoleButton = document.getElementById("modifyUserRoleButton");
    if (modifyUserRoleButton) {
        modifyUserRoleButton.addEventListener("click", openModifyUserRoleModal);
    }

    modifyUserRoleModalElements.confirmModifyUserRoleButton.addEventListener("click", modifyUserRole);
    modifyUserRoleModalElements.cancelModifyUserRoleButton.addEventListener("click", closeModifyUserRoleModal);

    window.addEventListener("click", (e: MouseEvent): void => {
        if (e.target === modifyUserRoleModalElements.modifyUserRoleModal) {
            closeModifyUserRoleModal();
        }
    });
};

export const initModifyUserRoleModalFunctionality = (): void => {
    if (isInitialized) return;

    initializeModifyUserRoleModalElements();
    bindModifyUserRoleModalEvents();

    isInitialized = true; 
};

export const cleanUpModifyUserRoleModalFunctionality = (): void => {
    if (modifyUserRoleModalElements.confirmModifyUserRoleButton) {
        modifyUserRoleModalElements.confirmModifyUserRoleButton.removeEventListener("click", modifyUserRole);
    }
    if (modifyUserRoleModalElements.cancelModifyUserRoleButton) {
        modifyUserRoleModalElements.cancelModifyUserRoleButton.removeEventListener("click", closeModifyUserRoleModal);
    }
    isInitialized = false; 
};
