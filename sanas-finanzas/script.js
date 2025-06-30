
const montoInput = document.getElementById('monto');
const descripcionInput = document.getElementById('descripcion');
const categoriaSelect = document.getElementById('categoria');
const errorTransaccion = document.getElementById('error-transaccion');
const lista = document.getElementById('lista');

let tipo = 'ingreso';
let transacciones = [];
let editandoId = null;

btnIngreso.onclick = () => {
  tipo = 'ingreso';
  btnIngreso.classList.remove('inactivo');
  btnGasto.classList.add('inactivo');
  montoInput.style.borderColor = '#28a745';
  montoInput.style.boxShadow = '0 0 6px #28a745aa';
};

btnGasto.onclick = () => {
  tipo = 'gasto';
  btnGasto.classList.remove('inactivo');
  btnIngreso.classList.add('inactivo');
  montoInput.style.borderColor = '#dc3545';
  montoInput.style.boxShadow = '0 0 6px #dc3545aa';
};

function formatearMoneda(num) {
  return num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });
}

function mostrarTransacciones() {
  lista.innerHTML = '';
  transacciones.forEach(tx => {
    const li = document.createElement('li');
    li.className = 'movimiento-item';

    const texto = document.createElement('div');
    texto.className = 'movimiento-text';
    texto.textContent = `[${tx.categoria}] ${tx.descripcion} - ${formatearMoneda(tx.monto)} (${tx.tipo})`;

    const botonesDiv = document.createElement('div');
    botonesDiv.className = 'movimiento-botones';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'editar-btn';
    btnEditar.textContent = '✏️';
    btnEditar.title = 'Editar';
    btnEditar.onclick = () => editarTransaccion(tx.id);

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'eliminar-btn';
    btnEliminar.textContent = '❌';
    btnEliminar.title = 'Eliminar';
    btnEliminar.onclick = () => eliminarTransaccion(tx.id);

    botonesDiv.appendChild(btnEditar);
    botonesDiv.appendChild(btnEliminar);

    li.appendChild(texto);
    li.appendChild(botonesDiv);

    lista.appendChild(li);
  });
  actualizarResumen();
}

function actualizarResumen() {
  const ingresos = transacciones
    .filter(tx => tx.tipo === 'ingreso')
    .reduce((acc, tx) => acc + tx.monto, 0);
  const gastos = transacciones
    .filter(tx => tx.tipo === 'gasto')
    .reduce((acc, tx) => acc + tx.monto, 0);
  const balance = ingresos - gastos;

  const balanceGrande = document.getElementById('balance-grande');
  balanceGrande.textContent = formatearMoneda(balance);
  balanceGrande.style.color = balance >= 0 ? '#28a745' : '#dc3545';
}

// Funciones agregar, editar, eliminar, login, register, logout etc iguales que antes...
