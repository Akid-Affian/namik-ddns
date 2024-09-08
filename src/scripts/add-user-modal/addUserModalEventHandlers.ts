import { initializeAddUserModalElements, openAddUserModal, closeAddUserModal, addUserModalElements } from "./addUserModalManager";
import { addUser } from "./addUserHandler";

export let isInitialized = false; 

export const bindAddUserModalEvents = (): void => {
    if (!addUserModalElements.confirmAddUserButton || !addUserModalElements.cancelAddUserButton) {
        return;
    }

    const addUserButton = document.getElementById("addUserButton");
    if (addUserButton) {
        addUserButton.addEventListener("click", openAddUserModal);
    }

    addUserModalElements.confirmAddUserButton.addEventListener("click", addUser);
    addUserModalElements.cancelAddUserButton.addEventListener("click", closeAddUserModal);

    window.addEventListener("click", (e: MouseEvent): void => {
        if (e.target === addUserModalElements.addUserModal) {
            closeAddUserModal();
        }
    });
};

export const initAddUserModalFunctionality = (): void => {
    if (isInitialized) return; 

    initializeAddUserModalElements();
    bindAddUserModalEvents();

    isInitialized = true; 
};

export const cleanUpAddUserModalFunctionality = (): void => {
    if (addUserModalElements.confirmAddUserButton) {
        addUserModalElements.confirmAddUserButton.removeEventListener("click", addUser);
    }
    if (addUserModalElements.cancelAddUserButton) {
        addUserModalElements.cancelAddUserButton.removeEventListener("click", closeAddUserModal);
    }
    isInitialized = false; 
};
