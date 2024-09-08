export let deleteUserModalElements: {
    deleteUserModal?: HTMLElement;
    confirmDeleteUserButton?: HTMLButtonElement;
    cancelDeleteUserButton?: HTMLButtonElement;
    usernameInput?: HTMLInputElement;
} = {};

export const initializeDeleteUserModalElements = (): void => {
    deleteUserModalElements = {
        deleteUserModal: document.getElementById("deleteUserModal") || undefined,
        confirmDeleteUserButton: document.getElementById("confirmDeleteUserButton") as HTMLButtonElement || undefined,
        cancelDeleteUserButton: document.getElementById("cancelDeleteUserButton") as HTMLButtonElement || undefined,
        usernameInput: document.getElementById("modalUsernameToDeleteInput") as HTMLInputElement || undefined,
    };
};

export const openDeleteUserModal = (): void => {
    if (deleteUserModalElements.deleteUserModal) {
        deleteUserModalElements.deleteUserModal.classList.remove("invisible", "opacity-0");
        deleteUserModalElements.deleteUserModal.classList.add("opacity-100");
    }
};

export const closeDeleteUserModal = (): void => {
    if (deleteUserModalElements.deleteUserModal) {
        deleteUserModalElements.deleteUserModal.classList.add("invisible", "opacity-0");
        deleteUserModalElements.deleteUserModal.classList.remove("opacity-100");
    }
};
