/**
 * SpendWise - Frontend Application Controller
 * Handles modal controls, keyboard shortcuts, theme switching, and notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // Theme Toggle Engine
  // --------------------------------------------------------------------------
  const themeToggleBtn = document.querySelector('#theme-toggle-btn');
  const htmlRoot = document.documentElement;

  // Retrieve saved preference or system preference
  const savedTheme = localStorage.getItem('spendwise-theme') || htmlRoot.getAttribute('data-theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = htmlRoot.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem('spendwise-theme', nextTheme);
    });
  }

  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
      themeToggleBtn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    }
  }

  // --------------------------------------------------------------------------
  // Quick-Add Modal Controller
  // --------------------------------------------------------------------------
  const quickAddModal = document.querySelector('#quick-add-modal');
  const quickAddTriggers = document.querySelectorAll('[data-open-quick-add]');
  const modalCloseTriggers = document.querySelectorAll('[data-close-modal]');

  function openQuickAdd(defaultType = 'expense') {
    if (!quickAddModal) return;
    const typeRadio = quickAddModal.querySelector(`input[name="kind"][value="${defaultType}"]`);
    if (typeRadio) typeRadio.checked = true;

    quickAddModal.classList.add('active');
    const titleInput = quickAddModal.querySelector('input[name="title"]');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }
  }

  function closeQuickAdd() {
    if (quickAddModal) {
      quickAddModal.classList.remove('active');
    }
  }

  quickAddTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.getAttribute('data-type') || 'expense';
      openQuickAdd(type);
    });
  });

  modalCloseTriggers.forEach(btn => {
    btn.addEventListener('click', closeQuickAdd);
  });

  if (quickAddModal) {
    quickAddModal.addEventListener('click', (e) => {
      if (e.target === quickAddModal) closeQuickAdd();
    });
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
      closeQuickAdd();
    }
    // Pressing 'n' or 'N' (when not inside inputs) opens Quick-Add
    if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openQuickAdd();
    }
  });

  // --------------------------------------------------------------------------
  // Preset Chips Controller (+50, +100, +500, +1000)
  // --------------------------------------------------------------------------
  document.querySelectorAll('[data-preset-amount]').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetSelector = chip.getAttribute('data-target-input') || 'input[name="amount"]';
      const form = chip.closest('form') || document;
      const input = form.querySelector(targetSelector);
      if (input) {
        const val = parseFloat(chip.getAttribute('data-preset-amount')) || 0;
        const current = parseFloat(input.value) || 0;
        input.value = (current + val).toFixed(2);
        input.focus();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Mobile Sidebar Drawer Toggle
  // --------------------------------------------------------------------------
  const mobileMenuBtn = document.querySelector('#mobile-menu-btn');
  const sidebar = document.querySelector('.app-sidebar');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileMenuBtn) {
        sidebar.classList.remove('open');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Confirmation Dialogs
  // --------------------------------------------------------------------------
  document.querySelectorAll('[data-confirm]').forEach(form => {
    form.addEventListener('submit', (e) => {
      const msg = form.getAttribute('data-confirm') || 'Are you sure you want to proceed?';
      if (!confirm(msg)) {
        e.preventDefault();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Auto-Dismissing Flash Toasts
  // --------------------------------------------------------------------------
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  });
});
