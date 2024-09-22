export function setupDeleteBaseDomainModal() {
    const enableButton = document.getElementById('enable-feature-button') as HTMLButtonElement;
    const disableButton = document.getElementById('disable-feature-button') as HTMLButtonElement;
    const passwordInput = document.getElementById('password-input') as HTMLInputElement;
  
    if (enableButton) {
      enableButton.addEventListener('click', async () => {
        if (!passwordInput) {
          alert('Password input element not found.');
          return;
        }
  
        const password = passwordInput.value.trim();
        
        if (!password) {
          alert('Password is required to enable the feature.');
          return;
        }
        
        try {
          const response = await fetch('/api/v2/admin/app-config/delete-base-domain', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              password, 
              enable: true
            })
          });
          
          const result = await response.json();
          
          if (response.ok) {
            alert(result.message ?? 'Delete base domain feature enabled successfully.');
            location.reload();
          } else {
            alert(result.error ?? 'Failed to enable the feature.');
          }
        } catch (error) {
          console.error('Error enabling delete base domain feature:', error);
          alert('An unexpected error occurred. Please try again.');
        }
      });
    }
  
    if (disableButton) {
      disableButton.addEventListener('click', async () => {
        if (!passwordInput) {
          alert('Password input element not found.');
          return;
        }
  
        const password = passwordInput.value.trim();
        
        if (!password) {
          alert('Password is required to disable the feature.');
          return;
        }
        
        try {
          const response = await fetch('/api/v2/admin/app-config/delete-base-domain', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              password,
              enable: false
            })
          });
          
          const result = await response.json();
          
          if (response.ok) {
            alert(result.message ?? 'Delete base domain feature disabled successfully.');
            location.reload();
          } else {
            alert(result.error ?? 'Failed to disable the feature.');
          }
        } catch (error) {
          console.error('Error disabling delete base domain feature:', error);
          alert('An unexpected error occurred. Please try again.');
        }
      });
    }
  }
  