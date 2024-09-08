export let addUserModalElements: {
    addUserModal?: HTMLElement;
    confirmAddUserButton?: HTMLButtonElement;
    cancelAddUserButton?: HTMLButtonElement;
    usernameInput?: HTMLInputElement;
    passwordInput?: HTMLInputElement;
    confirmPasswordInput?: HTMLInputElement;
} = {};

export const initializeAddUserModalElements = (): void => {
    addUserModalElements = {
        addUserModal: document.getElementById("addUserModal") || undefined,
        confirmAddUserButton: document.getElementById("confirmAddUserButton") as HTMLButtonElement || undefined,
        cancelAddUserButton: document.getElementById("cancelAddUserButton") as HTMLButtonElement || undefined,
        usernameInput: document.getElementById("modalUsernameInput") as HTMLInputElement || undefined,
        passwordInput: document.getElementById("modalPasswordInput") as HTMLInputElement || undefined,
        confirmPasswordInput: document.getElementById("modalConfirmPasswordInput") as HTMLInputElement || undefined,
    };
};

export const openAddUserModal = (): void => {
    if (addUserModalElements.addUserModal) {
        addUserModalElements.addUserModal.classList.remove("invisible", "opacity-0");
        addUserModalElements.addUserModal.classList.add("opacity-100");
    }
};

export const closeAddUserModal = (): void => {
    if (addUserModalElements.addUserModal) {
        addUserModalElements.addUserModal.classList.add("invisible", "opacity-0");
        addUserModalElements.addUserModal.classList.remove("opacity-100");
    }
};
