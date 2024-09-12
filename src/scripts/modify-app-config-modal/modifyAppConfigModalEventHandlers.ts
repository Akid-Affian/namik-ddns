import {
    initializeModifyAppConfigModalElements,
    openModifyAppConfigModal,
    closeModifyAppConfigModal,
    modifyAppConfigModalElements,
} from "./modifyAppConfigModalManager";
import { modifyAppConfig } from "./modifyAppConfigHandler";

export let isAppConfigInitialized = false;

export const bindModifyAppConfigModalEvents = (): void => {
    if (!modifyAppConfigModalElements.confirmModifyAppConfigButton || !modifyAppConfigModalElements.cancelModifyAppConfigButton) {
        return;
    }

    const modifyAppConfigButton = document.getElementById("modifyAppConfigButton");
    if (modifyAppConfigButton) {
        modifyAppConfigButton.addEventListener("click", openModifyAppConfigModal);
    }

    modifyAppConfigModalElements.confirmModifyAppConfigButton.addEventListener("click", modifyAppConfig);
    modifyAppConfigModalElements.cancelModifyAppConfigButton.addEventListener("click", closeModifyAppConfigModal);

    window.addEventListener("click", (e: MouseEvent): void => {
        if (e.target === modifyAppConfigModalElements.modifyAppConfigModal) {
            closeModifyAppConfigModal();
        }
    });
};

export const initModifyAppConfigModalFunctionality = (): void => {
    if (isAppConfigInitialized) return;

    initializeModifyAppConfigModalElements();
    bindModifyAppConfigModalEvents();

    isAppConfigInitialized = true;
};

export const cleanUpModifyAppConfigModalFunctionality = (): void => {
    if (modifyAppConfigModalElements.confirmModifyAppConfigButton) {
        modifyAppConfigModalElements.confirmModifyAppConfigButton.removeEventListener("click", modifyAppConfig);
    }
    if (modifyAppConfigModalElements.cancelModifyAppConfigButton) {
        modifyAppConfigModalElements.cancelModifyAppConfigButton.removeEventListener("click", closeModifyAppConfigModal);
    }
    isAppConfigInitialized = false;
};
