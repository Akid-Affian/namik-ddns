import { closeModifyAppConfigModal, modifyAppConfigModalElements } from "./modifyAppConfigModalManager";

export const modifyAppConfig = async (): Promise<void> => {
    const enableWebRegistration = modifyAppConfigModalElements.enableWebRegistrationSelect?.value;
    const authTokenMaxAge = modifyAppConfigModalElements.authTokenMaxAgeInput?.value.trim();

    // Validate the input for auth_token_max_age
    if (!authTokenMaxAge || isNaN(Number(authTokenMaxAge)) || Number(authTokenMaxAge) < 5 || Number(authTokenMaxAge) > 60) {
        alert("Please enter a valid Auth Token Max Age between 5 and 60.");
        return;
    }

    // Check if enabling web registration and show warning
    if (enableWebRegistration === '1') {
        const confirmation = confirm("Enabling web registration means that other and random users can sign up. Are you sure you want to enable it?");
        if (!confirmation) {
            return;
        }
    }

    try {
        const formData = new URLSearchParams();
        formData.append("enable_web_registration", enableWebRegistration!);
        formData.append("auth_token_max_age", authTokenMaxAge);

        const response = await fetch("/api/modify-app-config", {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const result = await response.json();

        if (response.ok) {
            alert("App config updated successfully");
            closeModifyAppConfigModal();
            location.reload(); // Hard refresh to reflect changes
        } else {
            alert(result.error ?? "Failed to update app config");
        }
    } catch (error) {
        console.error("Error updating app config:", error);
        alert("An unexpected error occurred");
    }
};
