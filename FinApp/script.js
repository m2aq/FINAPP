let balance = 0;

function agregarTransaccion() {
  const descripcion = document.getElementById("descripcion").value;
  const monto = parseFloat(document.getElementById("monto").value);

  if (!descripcion || isNaN(monto)) {
    alert("Ingresa descripción y monto válido.");
    return;
  }

  balance += monto;
  document.getElementById("balance").textContent = "$" + balance.toFixed(2);

  const lista = document.getElementById("lista");
  const item = document.createElement("li");
  item.textContent = `${descripcion}: $${monto.toFixed(2)}`;
  item.style.borderLeftColor = monto >= 0 ? "#28a745" : "#dc3545";
  lista.appendChild(item);

  document.getElementById("descripcion").value = "";
  document.getElementById("monto").value = "";
}
