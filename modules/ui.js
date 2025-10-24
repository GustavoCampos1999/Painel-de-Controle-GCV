let toastElement = null;

export function initUI(elements) {
    toastElement = elements.toast;
    setupTabs();
    setupSubTabs();
}

export function showToast(message, isError = false) {
    if (!toastElement) { console.warn("Elemento Toast não inicializado."); return; }
    toastElement.textContent = message;
    toastElement.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    toastElement.classList.add('show');
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 2000);
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabButtons.length === 0 || tabContents.length === 0) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const targetContent = document.getElementById(targetTabId);
            if(targetContent) targetContent.classList.add('active');
        });
    });
}

function setupSubTabs() {
    const subTabButtons = document.querySelectorAll('#tab-gerenciar-dados .subtab-button');
    const subTabContents = document.querySelectorAll('#tab-gerenciar-dados .subtab-content');
    if (subTabButtons.length === 0 || subTabContents.length === 0) return;

    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSubTabId = button.dataset.subtab;
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            subTabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const targetContent = document.getElementById(targetSubTabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

export function openModal(modalElement) {
    if (modalElement) modalElement.style.display = 'flex';
}

export function closeModal(modalElement) {
    if (modalElement) modalElement.style.display = 'none';
}