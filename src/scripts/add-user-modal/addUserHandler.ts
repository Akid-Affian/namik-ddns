import { closeAddUserModal } from "./addUserModalManager";

export const addUser = async (): Promise<void> => {
    const usernameInput = document.getElementById("modalUsernameInput") as HTMLInputElement;
    const passwordInput = document.getElementById("modalPasswordInput") as HTMLInputElement;
    const confirmPasswordInput = document.getElementById("modalConfirmPasswordInput") as HTMLInputElement;
    const roleSelect = document.getElementById("modalRoleSelect") as HTMLSelectElement;

    const username = usernameInput?.value;
    const password = passwordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    const role = roleSelect?.value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch('/api/admin/add-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                username,
                password,
                role,
            })
        });

        if (!response.ok) {
            // Handle different error statuses accordingly
            if (response.status === 409) {
                alert('Username already exists!');
            } else if (response.status === 400) {
                alert('Invalid user data!');
            } else if (response.status === 401) {
                alert('Unauthorized: Please log in again!');
            } else if (response.status === 403) {
                alert('Forbidden: You do not have the necessary permissions!');
            } else {
                alert('An error occurred while adding the user!');
            }
            return;
        }

        const result = await response.json();
        if (result.success) {
            alert('User added successfully!');
            closeAddUserModal();

            window.location.reload(); 
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('An error occurred during the request:', error);
        alert('An error occurred while adding the user. Please try again later.');
    }
};
