import { closeModifyUserRoleModal, modifyUserRoleModalElements } from "./modifyUserRoleModalManager";

export const modifyUserRole = async (): Promise<void> => {
    const username = modifyUserRoleModalElements.usernameInput?.value.trim();
    const selectedRole = modifyUserRoleModalElements.roleSelect?.value;

    if (!username) {
        alert("Please enter a username.");
        return;
    }

    if (!selectedRole) {
        alert("Please select a role.");
        return;
    }

    const userRow = Array.from(document.querySelectorAll("tbody tr")).find(
        (row) => row.querySelector("td:first-child")?.textContent?.trim() === username
    ) as HTMLTableRowElement | undefined;

    if (!userRow) {
        alert("User not found.");
        return;
    }

    const userId = userRow.getAttribute("data-user-id");
    console.log("Modifying role for user with ID:", userId);

    if (!userId) {
        alert("User ID not found.");
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append("userId", userId);
        formData.append("role", selectedRole);

        const response = await fetch("/api/admin/modify-user-role", {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Successfully modified role for ${username} to ${selectedRole}`);
            closeModifyUserRoleModal();
            location.href = location.href; // Perform a hard refresh to reflect changes
        } else {
            alert(result.error ?? "Failed to modify user role");
        }
    } catch (error) {
        console.error("Error modifying user role:", error);
        alert("An unexpected error occurred");
    }
};
