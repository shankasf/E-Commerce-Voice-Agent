(() => {
  const dropButtons = document.querySelectorAll('[data-drop]');
  if (dropButtons.length === 0) {
    return;
  }

  const dropForm = document.querySelector('form[action="/db/drop"]');
  if (!dropForm) {
    return;
  }

  const nameInput = dropForm.querySelector('input[name="dbName"]');
  const confirmInput = dropForm.querySelector('input[name="confirmName"]');

  dropButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.drop;
      nameInput.value = name;
      confirmInput.value = '';
      dropForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
})();
