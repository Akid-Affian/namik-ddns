export let modifyUserRoleModalElements: {
    modifyUserRoleModal?: HTMLElement;
    confirmModifyUserRoleButton?: HTMLButtonElement;
    cancelModifyUserRoleButton?: HTMLButtonElement;
    usernameInput?: HTMLInputElement;
    roleSelect?: HTMLSelectElement;
} = {};

export const initializeModifyUserRoleModalElements = (): void => {
    modifyUserRoleModalElements = {
        modifyUserRoleModal: document.getElementById("modifyUserRoleModal") || undefined,
        confirmModifyUserRoleButton: document.getElementById("confirmModifyUserRoleButton") as HTMLButtonElement || undefined,
        cancelModifyUserRoleButton: document.getElementById("cancelModifyUserRoleButton") as HTMLButtonElement || undefined,
        usernameInput: document.getElementById("modifyModalUsernameInput") as HTMLInputElement || undefined,
        roleSelect: document.getElementById("modifyModalRoleSelect") as HTMLSelectElement || undefined,
    };
};

export const openModifyUserRoleModal = (): void => {
    if (modifyUserRoleModalElements.modifyUserRoleModal) {
        modifyUserRoleModalElements.modifyUserRoleModal.classList.remove("invisible", "opacity-0");
        modifyUserRoleModalElements.modifyUserRoleModal.classList.add("opacity-100");
    }
};

export const closeModifyUserRoleModal = (): void => {
    if (modifyUserRoleModalElements.modifyUserRoleModal) {
        modifyUserRoleModalElements.modifyUserRoleModal.classList.add("invisible", "opacity-0");
        modifyUserRoleModalElements.modifyUserRoleModal.classList.remove("opacity-100");
    }
};
