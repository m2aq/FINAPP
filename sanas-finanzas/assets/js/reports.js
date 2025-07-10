document.addEventListener('DOMContentLoaded', function () {
    // Get Firebase Auth and Firestore instances
    const auth = firebase.auth();
    const db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const userInfoDisplay = document.querySelector('.user-info span');

    let currentUser = null;

    // --- Funciones de Utilidad ---
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay(); // Sunday - 0, Monday - 1, etc.
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getEndOfWeek(date) {
        const d = new Date(getStartOfWeek(date));
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    function getStartOfMonth(date) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getEndOfMonth(date) {
        const d = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        return d;
    }

    function getStartOfYear(date) {
        const d = new Date(date.getFullYear(), 0, 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getEndOfYear(date) {
        const d = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
        return d;
    }

    // --- Firebase Auth State Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userInfoDisplay.textContent = user.email;
            // Generate all reports on page load
            generateWeeklyExpensesReport();
            generateMonthlyIncomeExpenseReport();
            generateYearlyIncomeExpenseReport();
            console.log("User authenticated in reports page.");
        } else {
            currentUser = null;
            window.location.href = 'login.html';
        }
    });

    async function generateWeeklyExpensesReport() {
        if (!currentUser) return;

        const reportContainer = document.getElementById('weekly-expenses-report');
        const chartCanvas = document.getElementById('weeklyExpensesChart');
        const ctx = chartCanvas.getContext('2d');

        // Clear previous chart if it exists
        if (window.weeklyExpensesChartInstance) {
            window.weeklyExpensesChartInstance.destroy();
        }

        // Clear previous summary text, but keep the canvas
        reportContainer.querySelectorAll('h3, p').forEach(el => el.remove());

        const today = new Date();
        const startDate = getStartOfWeek(today);
        const endDate = getEndOfWeek(today);

        try {
            const snapshot = await db.collection("users").doc(currentUser.uid).collection("transactions")
                .where("date", ">=", startDate.toISOString())
                .where("date", "<=", endDate.toISOString())
                .orderBy("date", "asc")
                .get();

            let expensesByCategory = {};
            let totalWeeklyExpenses = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'expense') {
                    const category = transaction.category || 'Sin Categoría';
                    expensesByCategory[category] = (expensesByCategory[category] || 0) + transaction.amount;
                    totalWeeklyExpenses += transaction.amount;
                }
            });

            // Create a div for the summary text
            const summaryDiv = document.createElement('div');
            summaryDiv.innerHTML = `
                <h3>Semana del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}</h3>
                <p>Total de Gastos: <strong>${formatCurrency(totalWeeklyExpenses)}</strong></p>
            `;
            reportContainer.prepend(summaryDiv); // Prepend summary before the chart

            if (totalWeeklyExpenses === 0) {
                const noDataMessage = document.createElement('p');
                noDataMessage.textContent = 'No hay gastos registrados para esta semana.';
                reportContainer.appendChild(noDataMessage);
                chartCanvas.style.display = 'none'; // Hide canvas if no data
                return;
            } else {
                chartCanvas.style.display = 'block'; // Ensure canvas is visible if there's data
            }

            // Prepare data for Chart.js
            const categories = Object.keys(expensesByCategory);
            const amounts = Object.values(expensesByCategory);

            // Generate dynamic colors for pie chart
            const backgroundColors = categories.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
            const borderColors = categories.map((color, index) => backgroundColors[index].replace('0.6', '1'));

            // Create the pie chart
            window.weeklyExpensesChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        label: 'Gastos por Categoría',
                        data: amounts,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `Gastos Semanales (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += formatCurrency(context.raw);
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Error al generar el reporte semanal de gastos:", error);
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Error al cargar el reporte.';
            reportContainer.appendChild(errorMessage);
            chartCanvas.style.display = 'none'; // Hide canvas on error
        }
    }

    async function generateMonthlyIncomeExpenseReport() {
        if (!currentUser) return;

        const reportContainer = document.getElementById('monthly-income-expense-report');
        const chartCanvas = document.getElementById('monthlyIncomeExpenseChart');
        const ctx = chartCanvas.getContext('2d');

        // Clear previous chart if it exists
        if (window.monthlyIncomeExpenseChartInstance) {
            window.monthlyIncomeExpenseChartInstance.destroy();
        }

        // Clear previous summary text, but keep the canvas
        reportContainer.querySelectorAll('h3, p').forEach(el => el.remove());

        const today = new Date();
        const startDate = getStartOfMonth(today);
        const endDate = getEndOfMonth(today);

        try {
            const snapshot = await db.collection("users").doc(currentUser.uid).collection("transactions")
                .where("date", ">=", startDate.toISOString())
                .where("date", "<=", endDate.toISOString())
                .orderBy("date", "asc")
                .get();

            let totalIncome = 0;
            let totalExpense = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount;
                } else if (transaction.type === 'expense') {
                    totalExpense += transaction.amount;
                }
            });

            // Create a div for the summary text
            const summaryDiv = document.createElement('div');
            summaryDiv.innerHTML = `
                <h3>Resumen Mensual (${startDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})</h3>
                <p>Ingresos: <strong>${formatCurrency(totalIncome)}</strong></p>
                <p>Gastos: <strong>${formatCurrency(totalExpense)}</strong></p>
            `;
            reportContainer.prepend(summaryDiv);

            if (totalIncome === 0 && totalExpense === 0) {
                const noDataMessage = document.createElement('p');
                noDataMessage.textContent = 'No hay ingresos ni gastos registrados para este mes.';
                reportContainer.appendChild(noDataMessage);
                chartCanvas.style.display = 'none';
                return;
            } else {
                chartCanvas.style.display = 'block';
            }

            // Prepare data for Chart.js
            const data = [
                totalIncome,
                totalExpense
            ];
            const labels = [
                'Ingresos',
                'Gastos'
            ];
            const backgroundColors = [
                'rgba(75, 192, 192, 0.6)', // Green for Income
                'rgba(255, 99, 132, 0.6)'  // Red for Expense
            ];
            const borderColors = [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)'
            ];

            // Create the pie chart
            window.monthlyIncomeExpenseChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Ingresos vs. Gastos Mensuales'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += formatCurrency(context.raw);
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Error al generar el reporte mensual de ingresos vs gastos:", error);
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Error al cargar el reporte.';
            reportContainer.appendChild(errorMessage);
            chartCanvas.style.display = 'none';
        }
    }

    async function generateYearlyIncomeExpenseReport() {
        if (!currentUser) return;

        const reportContainer = document.getElementById('yearly-income-expense-report');
        const chartCanvas = document.getElementById('yearlyIncomeExpenseChart');
        const ctx = chartCanvas.getContext('2d');

        // Clear previous chart if it exists
        if (window.yearlyIncomeExpenseChartInstance) {
            window.yearlyIncomeExpenseChartInstance.destroy();
        }

        // Clear previous summary text, but keep the canvas
        reportContainer.querySelectorAll('h3, p').forEach(el => el.remove());

        const today = new Date();
        const startDate = getStartOfYear(today);
        const endDate = getEndOfYear(today);
        console.log('Reporte Anual: Rango de fechas', startDate.toISOString(), 'a', endDate.toISOString());

        try {
            const snapshot = await db.collection("users").doc(currentUser.uid).collection("transactions")
                .where("date", ">=", startDate.toISOString())
                .where("date", "<=", endDate.toISOString())
                .orderBy("date", "asc")
                .get();

            let totalIncome = 0;
            let totalExpense = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount;
                } else if (transaction.type === 'expense') {
                    totalExpense += transaction.amount;
                }
            });

            // Create a div for the summary text
            const summaryDiv = document.createElement('div');
            summaryDiv.innerHTML = `
                <h3>Resumen Anual (${startDate.getFullYear()})</h3>
                <p>Ingresos: <strong>${formatCurrency(totalIncome)}</strong></p>
                <p>Gastos: <strong>${formatCurrency(totalExpense)}</strong></p>
            `;
            reportContainer.prepend(summaryDiv);

            if (totalIncome === 0 && totalExpense === 0) {
                const noDataMessage = document.createElement('p');
                noDataMessage.textContent = 'No hay ingresos ni gastos registrados para este año.';
                reportContainer.appendChild(noDataMessage);
                chartCanvas.style.display = 'none';
                return;
            } else {
                chartCanvas.style.display = 'block';
            }

            // Prepare data for Chart.js
            const data = [
                totalIncome,
                totalExpense
            ];
            const labels = [
                'Ingresos',
                'Gastos'
            ];
            const backgroundColors = [
                'rgba(75, 192, 192, 0.6)', // Green for Income
                'rgba(255, 99, 132, 0.6)'  // Red for Expense
            ];
            const borderColors = [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)'
            ];

            // Create the pie chart
            window.yearlyIncomeExpenseChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Ingresos vs. Gastos Anuales'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += formatCurrency(context.raw);
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Error al generar el reporte anual de ingresos vs gastos:", error);
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Error al cargar el reporte.';
            reportContainer.appendChild(errorMessage);
            chartCanvas.style.display = 'none';
        }
    }

    });
