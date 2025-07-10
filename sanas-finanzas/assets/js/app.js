document.addEventListener('DOMContentLoaded', function () {
    // Get Firebase Auth and Firestore instances
    const auth = firebase.auth();
    const db = firebase.firestore();

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
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionCategorySelect = document.getElementById('transaction-category');
    const typeIncomeRadio = document.getElementById('type-income');
    const typeExpenseRadio = document.getElementById('type-expense');
    const currentBalanceDisplay = document.getElementById('current-balance');
    const monthlyIncomeDisplay = document.getElementById('monthly-income');
    const monthlyExpenseDisplay = document.getElementById('monthly-expense');
    const transactionListDisplay = document.getElementById('transaction-list');

    let currentTransactionType = ''; // 'income' or 'expense'
    let currentUser = null; // To store the current authenticated user
    let editingTransactionId = null; // To store the ID of the transaction being edited

    // --- Firebase Auth State Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            // User is signed in, update UI and load data
            document.querySelector('.user-info span').textContent = user.email;
            renderTransactions(); // Load transactions for the current user
        } else {
            // User is signed out, redirect to login
            currentUser = null;
            window.location.href = 'login.html';
        }
    });

    // --- Funciones de Utilidad --- //
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }

    function formatDateToYYYYMMDD(date) {
        const year = date.getUTCFullYear(); // Use UTC year
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Use UTC month
        const day = date.getUTCDate().toString().padStart(2, '0'); // Use UTC day
        return `${year}-${month}-${day}`;
    }

    function clearForm() {
        transactionAmountInput.value = '';
        transactionDescriptionInput.value = '';
        transactionDateInput.value = formatDateToYYYYMMDD(new Date()); // Set current date using local format
        transactionCategorySelect.value = 'comida'; // Default category
        typeIncomeRadio.checked = false;
        typeExpenseRadio.checked = false;
        editingTransactionId = null; // Clear editing ID
    }

    function renderTransactions() {
        if (!currentUser) return; // Don't render if no user is logged in

        // Listen for real-time updates from Firestore
        db.collection("users").doc(currentUser.uid).collection("transactions").orderBy("date", "desc")
            .onSnapshot(snapshot => {
                transactionListDisplay.innerHTML = ''; // Clear current list

                let totalBalance = 0;
                let totalIncome = 0;
                let totalExpense = 0;

                // Reset balance color class
                currentBalanceDisplay.classList.remove('balance-positive', 'balance-negative');

                if (snapshot.empty) {
                    transactionListDisplay.innerHTML = `
                        <li class="empty-state">
                            <p>No hay transacciones todavía. ¡Añade una para empezar!</p>
                        </li>
                    `;
                } else {
                    snapshot.forEach(doc => {
                        const transaction = doc.data();

                        // Calculate total balance
                        if (transaction.type === 'income') {
                            totalBalance += transaction.amount;
                            totalIncome += transaction.amount;
                        } else {
                            totalBalance -= transaction.amount;
                            totalExpense += transaction.amount;
                        }

                        // Add to transaction list display
                        const listItem = document.createElement('li');
                        listItem.classList.add('transaction-item');
                        listItem.dataset.id = doc.id; // Store Firestore document ID
                        listItem.innerHTML = `
                            <span class="transaction-description">${transaction.description}</span>
                            <span class="transaction-amount ${transaction.type === 'income' ? 'income-text' : 'expense-text'}">${formatCurrency(transaction.amount)}</span>
                            <span class="transaction-date">${formatDateToYYYYMMDD(new Date(transaction.date))}</span>
                            <div class="transaction-actions">
                                <button class="action-icon-button edit-btn" data-id="${doc.id}"><i class="bi bi-pencil"></i></button>
                                <button class="action-icon-button delete-btn" data-id="${doc.id}"><i class="bi bi-trash"></i></button>
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

                monthlyIncomeDisplay.textContent = formatCurrency(totalIncome);
                monthlyExpenseDisplay.textContent = formatCurrency(totalExpense);

                // Attach event listeners for new buttons (after rendering)
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', handleDeleteTransaction);
                });
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', handleEditTransaction);
                });
            });
    }

    // --- Event Handlers for Transactions --- //
    function handleDeleteTransaction(event) {
        const transactionId = event.currentTarget.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            db.collection("users").doc(currentUser.uid).collection("transactions").doc(transactionId).delete()
                .then(() => {
                    console.log("Document successfully deleted!");
                })
                .catch((error) => {
                    console.error("Error removing document: ", error);
                    alert("Error al eliminar la transacción.");
                });
        }
    }

    function handleEditTransaction(event) {
        editingTransactionId = event.currentTarget.dataset.id;
        db.collection("users").doc(currentUser.uid).collection("transactions").doc(editingTransactionId).get()
            .then(doc => {
                if (doc.exists) {
                    const transaction = doc.data();
                    transactionAmountInput.value = transaction.amount;
                    transactionDescriptionInput.value = transaction.description;
                    // Set date input value
                    const transactionDate = new Date(transaction.date);
                    transactionDateInput.value = formatDateToYYYYMMDD(transactionDate);
                    transactionCategorySelect.value = transaction.category;
                    currentTransactionType = transaction.type; // Set type for modal styling
                    console.log('Cargando transacción para edición. Tipo original:', transaction.type);

                    openModal('edit'); // Open modal in edit mode
                } else {
                    console.log("No such document!");
                    alert("Transacción no encontrada.");
                }
            })
            .catch(error => {
                console.error("Error getting document:", error);
                alert("Error al cargar la transacción para edición.");
            });
    }

    // --- Event Listeners --- //
    logoutButton.addEventListener('click', function (event) {
        event.preventDefault();
        auth.signOut().then(() => {
            console.log('User signed out.');
            // Redirect handled by onAuthStateChanged listener
        }).catch((error) => {
            console.error('Error signing out:', error);
            alert('Error al cerrar sesión.');
        });
    });

    function openModal(mode, type = null) {
        // mode can be 'add' or 'edit'
        // type is 'income' or 'expense' for 'add' mode

        modal.style.display = 'flex';

        if (mode === 'add') {
            currentTransactionType = type;
            modalTitle.textContent = type === 'income' ? 'Añadir Ingreso' : 'Añadir Gasto';
            modalSubmitBtn.textContent = 'Añadir';
            modalSubmitBtn.style.backgroundColor = type === 'income' ? '#28a745' : '#dc3545';
            editingTransactionId = null; // Ensure no editing ID is set for add mode
            if (type === 'income') {
                typeIncomeRadio.checked = true;
            } else {
                typeExpenseRadio.checked = true;
            }
        } else if (mode === 'edit') {
            modalTitle.textContent = 'Editar Transacción';
            modalSubmitBtn.textContent = 'Guardar Cambios';
            // Set button color based on the transaction type being edited
            modalSubmitBtn.style.backgroundColor = currentTransactionType === 'income' ? '#28a745' : '#dc3545';
            // Set the correct radio button for the transaction type
            if (currentTransactionType === 'income') {
                typeIncomeRadio.checked = true;
            } else {
                typeExpenseRadio.checked = true;
            }
        }
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    incomeBtn.addEventListener('click', () => {
        clearForm();
        openModal('add', 'income');
    });
    expenseBtn.addEventListener('click', () => {
        clearForm();
        openModal('add', 'expense');
    });
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
        const selectedType = document.querySelector('input[name="transaction-type"]:checked').value;
        const transactionDate = transactionDateInput.value; // Get date from input

        if (isNaN(amount) || amount <= 0 || description === '') {
            alert('Por favor, ingresa un monto válido y una descripción.');
            return;
        }

        if (!currentUser) {
            alert('No hay usuario autenticado. Por favor, inicia sesión de nuevo.');
            return;
        }

        const newTransaction = {
            type: selectedType,
            amount: amount,
            description: description,
            category: category,
            date: new Date(transactionDate).toISOString() // Use selected date
        };

        if (editingTransactionId) {
            // Update existing transaction
            db.collection("users").doc(currentUser.uid).collection("transactions").doc(editingTransactionId).update(newTransaction)
                .then(() => {
                    console.log("Transaction successfully updated!");
                    clearForm();
                    closeModal();
                    editingTransactionId = null; // Reset editing ID
                })
                .catch((error) => {
                    console.error("Error updating transaction: ", error);
                    alert("Error al actualizar la transacción.");
                });
        } else {
            // Save new transaction to Firestore
            db.collection("users").doc(currentUser.uid).collection("transactions").add(newTransaction)
                .then(() => {
                    console.log("Transaction successfully written!");
                    clearForm();
                    closeModal();
                })
                .catch((error) => {
                    console.error("Error writing transaction: ", error);
                    alert("Error al guardar la transacción.");
                });
        }
    });

    console.log("App cargada y usuario autenticado.");

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sanas-finanzas/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});