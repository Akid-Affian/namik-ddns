export let modifyAppConfigModalElements: {
    modifyAppConfigModal?: HTMLElement;
    confirmModifyAppConfigButton?: HTMLButtonElement;
    cancelModifyAppConfigButton?: HTMLButtonElement;
    enableWebRegistrationSelect?: HTMLSelectElement;
    authTokenMaxAgeInput?: HTMLInputElement;
} = {};

// Function to populate form with data from the API
const populateAppConfigForm = async (): Promise<void> => {
    try {
        const response = await fetch("/api/admin/modify-app-config");
        const result = await response.json();

        if (response.ok && result.success) {
            const { enable_web_registration, auth_token_max_age } = result.config;

            if (modifyAppConfigModalElements.enableWebRegistrationSelect) {
                modifyAppConfigModalElements.enableWebRegistrationSelect.value = String(enable_web_registration);
            }
            if (modifyAppConfigModalElements.authTokenMaxAgeInput) {
                modifyAppConfigModalElements.authTokenMaxAgeInput.value = String(auth_token_max_age);
            }
        } else {
            console.error("Failed to fetch app config:", result.error);
        }
    } catch (error) {
        console.error("Error fetching app config:", error);
    }
};

export const initializeModifyAppConfigModalElements = (): void => {
    modifyAppConfigModalElements = {
        modifyAppConfigModal: document.getElementById("modifyAppConfigModal") || undefined,
        confirmModifyAppConfigButton: document.getElementById("confirmModifyAppConfigButton") as HTMLButtonElement || undefined,
        cancelModifyAppConfigButton: document.getElementById("cancelModifyAppConfigButton") as HTMLButtonElement || undefined,
        enableWebRegistrationSelect: document.getElementById("enableWebRegistrationSelect") as HTMLSelectElement || undefined,
        authTokenMaxAgeInput: document.getElementById("authTokenMaxAgeInput") as HTMLInputElement || undefined,
    };
};

// Open modal and populate form
export const openModifyAppConfigModal = (): void => {
    if (modifyAppConfigModalElements.modifyAppConfigModal) {
        modifyAppConfigModalElements.modifyAppConfigModal.classList.remove("invisible", "opacity-0");
        modifyAppConfigModalElements.modifyAppConfigModal.classList.add("opacity-100");

        populateAppConfigForm();
    }
};

export const closeModifyAppConfigModal = (): void => {
    if (modifyAppConfigModalElements.modifyAppConfigModal) {
        modifyAppConfigModalElements.modifyAppConfigModal.classList.add("invisible", "opacity-0");
        modifyAppConfigModalElements.modifyAppConfigModal.classList.remove("opacity-100");
    }
};
