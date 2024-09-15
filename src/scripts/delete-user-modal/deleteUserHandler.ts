import { closeDeleteUserModal } from "./deleteUserModalManager";

export const deleteUser = async (): Promise<void> => {
    const usernameInput = document.getElementById("modalUsernameToDeleteInput") as HTMLInputElement;
    const username = usernameInput?.value.trim();

    if (!username) {
        alert("Please enter a username.");
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

    if (!userId) {
        alert("User ID not found.");
        return;
    }

    const userConfirmation = prompt("Type 'CONFIRM' to delete the user:");
    if (!userConfirmation || userConfirmation.toUpperCase() !== "CONFIRM") {
        alert("Deletion cancelled. You must type 'CONFIRM' to delete the user.");
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append("userId", userId);

        const response = await fetch("/api/admin/delete-user", {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message ?? "User deleted successfully");
            closeDeleteUserModal();
            location.href = location.href;
        } else {
            alert(result.error ?? "Failed to delete user");
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("An unexpected error occurred");
    }
};

