import { initializeDeleteUserModalElements, openDeleteUserModal, closeDeleteUserModal, deleteUserModalElements } from "./deleteUserModalManager";
import { deleteUser } from "./deleteUserHandler";

export let isInitialized = false; 

export const bindDeleteUserModalEvents = (): void => {
    if (!deleteUserModalElements.confirmDeleteUserButton || !deleteUserModalElements.cancelDeleteUserButton) {
        return;
    }

    // Bind "Delete User" button click event to open the modal
    const deleteUserButton = document.getElementById("deleteUserButton");
    if (deleteUserButton) {
        deleteUserButton.addEventListener("click", openDeleteUserModal);
    }

    deleteUserModalElements.confirmDeleteUserButton.addEventListener("click", deleteUser);
    deleteUserModalElements.cancelDeleteUserButton.addEventListener("click", closeDeleteUserModal);

    window.addEventListener("click", (e: MouseEvent): void => {
        if (e.target === deleteUserModalElements.deleteUserModal) {
            closeDeleteUserModal();
        }
    });
};

export const initDeleteUserModalFunctionality = (): void => {
    if (isInitialized) return; 

    initializeDeleteUserModalElements();
    bindDeleteUserModalEvents();

    isInitialized = true;
};

export const cleanUpDeleteUserModalFunctionality = (): void => {
    if (deleteUserModalElements.confirmDeleteUserButton) {
        deleteUserModalElements.confirmDeleteUserButton.removeEventListener("click", deleteUser);
    }
    if (deleteUserModalElements.cancelDeleteUserButton) {
        deleteUserModalElements.cancelDeleteUserButton.removeEventListener("click", closeDeleteUserModal);
    }
    isInitialized = false; 
};
