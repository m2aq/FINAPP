document.addEventListener('DOMContentLoaded', function () {
    // Proteger la ruta: si no está logueado, redirigir al login
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return; // Detener la ejecución del script si no está logueado
    }

    const logoutButton = document.getElementById('logout-button');
    const incomeBtn = document.querySelector('.income-btn');
    const expenseBtn = document.querySelector('.expense-btn');
    const modal = document.getElementById('transaction-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const transactionForm = document.getElementById('transaction-form');
    const transactionAmountInput = document.getElementById('transaction-amount');
    const transactionDescriptionInput = document.getElementById('transaction-description');
    const transactionCategorySelect = document.getElementById('transaction-category');
    const currentBalanceDisplay = document.getElementById('current-balance');
    const monthlyIncomeDisplay = document.getElementById('monthly-income');
    const monthlyExpenseDisplay = document.getElementById('monthly-expense');
    const transactionListDisplay = document.getElementById('transaction-list');

    let currentTransactionType = ''; // 'income' or 'expense'

    // --- Funciones de Utilidad --- //
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }

    function getTransactions() {
        return JSON.parse(localStorage.getItem('transactions')) || [];
    }

    function saveTransactions(transactions) {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function clearForm() {
        transactionAmountInput.value = '';
        transactionDescriptionInput.value = '';
        transactionCategorySelect.value = 'comida'; // Default category
    }

    function renderTransactions() {
        const transactions = getTransactions();
        transactionListDisplay.innerHTML = ''; // Clear current list

        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Reset balance color class
        currentBalanceDisplay.classList.remove('balance-positive', 'balance-negative');

        if (transactions.length === 0) {
            transactionListDisplay.innerHTML = `
                <li class="empty-state">
                    <p>No hay transacciones todavía. ¡Añade una para empezar!</p>
                </li>
            `;
        } else {
            // Sort transactions by date, newest first
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            transactions.forEach(transaction => {
                const transactionDate = new Date(transaction.date);
                const transactionMonth = transactionDate.getMonth();
                const transactionYear = transactionDate.getFullYear();

                // Calculate total balance
                if (transaction.type === 'income') {
                    totalBalance += transaction.amount;
                } else {
                    totalBalance -= transaction.amount;
                }

                // Calculate monthly income/expense
                if (transactionMonth === currentMonth && transactionYear === currentYear) {
                    if (transaction.type === 'income') {
                        monthlyIncome += transaction.amount;
                    } else {
                        monthlyExpense += transaction.amount;
                    }
                }

                // Add to transaction list display
                const listItem = document.createElement('li');
                listItem.classList.add('transaction-item');
                listItem.dataset.id = transaction.id; // Store transaction ID
                listItem.innerHTML = `
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="transaction-amount ${transaction.type === 'income' ? 'income-text' : 'expense-text'}">${formatCurrency(transaction.amount)}</span>
                    <span class="transaction-date">${transactionDate.toLocaleDateString()} ${transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div class="transaction-actions">
                        <button class="action-icon-button edit-btn" data-id="${transaction.id}"><i class="bi bi-pencil"></i></button>
                        <button class="action-icon-button delete-btn" data-id="${transaction.id}"><i class="bi bi-trash"></i></button>
                    </div>
                `;
                transactionListDisplay.appendChild(listItem);
            });
        }

        currentBalanceDisplay.textContent = formatCurrency(totalBalance);
        if (totalBalance >= 0) {
            currentBalanceDisplay.classList.add('balance-positive');
        } else {
            currentBalanceDisplay.classList.add('balance-negative');
        }

        monthlyIncomeDisplay.textContent = formatCurrency(monthlyIncome);
        monthlyExpenseDisplay.textContent = formatCurrency(monthlyExpense);

        // Attach event listeners for new buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteTransaction);
        });
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditTransaction);
        });
    }

    // --- Event Handlers for Transactions --- //
    function handleDeleteTransaction(event) {
        const transactionId = parseInt(event.currentTarget.dataset.id);
        let transactions = getTransactions();
        transactions = transactions.filter(t => t.id !== transactionId);
        saveTransactions(transactions);
        renderTransactions();
    }

    function handleEditTransaction(event) {
        const transactionId = parseInt(event.currentTarget.dataset.id);
        // Placeholder for edit logic
        console.log('Edit transaction with ID:', transactionId);
        alert('Funcionalidad de edición en desarrollo.');
    }

    // --- Event Listeners --- //
    logoutButton.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });

    function openModal(type) {
        currentTransactionType = type;
        modal.style.display = 'flex';
        clearForm(); // Clear form fields when opening modal
        if (type === 'income') {
            modalTitle.textContent = 'Añadir Ingreso';
            modalSubmitBtn.style.backgroundColor = '#28a745';
        } else {
            modalTitle.textContent = 'Añadir Gasto';
            modalSubmitBtn.style.backgroundColor = '#dc3545';
        }
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    incomeBtn.addEventListener('click', () => openModal('income'));
    expenseBtn.addEventListener('click', () => openModal('expense'));
    closeModalBtn.addEventListener('click', closeModal);

    // Cerrar modal si se hace clic fuera del contenido
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const amount = parseFloat(transactionAmountInput.value);
        const description = transactionDescriptionInput.value.trim();
        const category = transactionCategorySelect.value;

        if (isNaN(amount) || amount <= 0 || description === '') {
            alert('Por favor, ingresa un monto válido y una descripción.');
            return;
        }

        const newTransaction = {
            id: Date.now(), // Simple unique ID
            type: currentTransactionType,
            amount: amount,
            description: description,
            category: category,
            date: new Date().toISOString() // ISO string for easy storage and parsing
        };

        const transactions = getTransactions();
        transactions.push(newTransaction);
        saveTransactions(transactions);

        clearForm();
        closeModal();
        renderTransactions(); // Re-render to update dashboard
    });

    // Initial render when app loads
    renderTransactions();

    console.log("App cargada y usuario autenticado.");
});