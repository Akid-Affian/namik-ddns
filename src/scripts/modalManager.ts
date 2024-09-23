function openModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('invisible', 'opacity-0');
      modal.classList.add('visible', 'opacity-100');
      modal.setAttribute('aria-hidden', 'false');
    } else {
      console.error(`Modal with ID ${modalId} not found`);
    }
  }

  function closeModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('visible', 'opacity-100');
      modal.classList.add('invisible', 'opacity-0');
      modal.setAttribute('aria-hidden', 'true');
    } else {
      console.error(`Modal with ID ${modalId} not found`);
    }
  }

 export function setupModalListeners() {
    const openModalButtons = document.querySelectorAll('[data-open-modal]');
    openModalButtons.forEach((button) => {
      const modalId = button.getAttribute('data-open-modal');
      if (modalId) {
        button.addEventListener('click', () => openModal(modalId));
      }
    });

    const closeModalButtons = document.querySelectorAll('.close-modal-button');
    closeModalButtons.forEach((button) => {
      const modalId = button.getAttribute('data-target');
      if (modalId) {
        button.addEventListener('click', () => closeModal(modalId));
      }
    });
  }

document.addEventListener('astro:page-load', setupModalListeners);