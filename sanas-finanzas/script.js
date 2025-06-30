
      cargarDatos();
    })
    .catch(e => errorTransaccion.textContent = "Error al guardar: " + e.message);
}

function cargarDatos() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("usuarios").doc(user.uid).collection("movimientos").orderBy("fecha", "desc").onSnapshot(snapshot => {
    lista.innerHTML = "";
    let ingresos = 0;
    let gastos = 0;

    snapshot.forEach(doc => {
      const t = doc.data();
      const li = document.createElement("li");
      li.className = "movimiento-item";

      const texto = `${t.descripcion} - $${t.monto.toFixed(2)} (${t.categoria})`;
      const spanTexto = document.createElement("span");
      spanTexto.className = "movimiento-text";
      spanTexto.textContent = texto;

      const btnEliminar = document.createElement("button");
      btnEliminar.className = "eliminar-btn";
      btnEliminar.textContent = "×";
      btnEliminar.title = "Eliminar movimiento";
      btnEliminar.onclick = () => {
        if (confirm("¿Eliminar este movimiento?")) {
          db.collection("usuarios").doc(user.uid).collection("movimientos").doc(doc.id).delete();
        }
      };

      li.appendChild(spanTexto);
      li.appendChild(btnEliminar);
      lista.appendChild(li);

      if (t.tipo === "ingreso") ingresos += t.monto;
      else gastos += t.monto;
    });

    const balance = ingresos - gastos;
    balanceElem.textContent = `$${balance.toFixed(2)}`;
    balanceDetElem.textContent = `$${balance.toFixed(2)}`;
    totalIngresosElem.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosElem.textContent = `$${gastos.toFixed(2)}`;
  });
}

function limpiarCampos() {
  descripcionInput.value = "";
  montoInput.value = "";
  categoriaSelect.value = "General";
  errorTransaccion.textContent = "";
  montoInput.style.borderColor = "";
  montoInput.style.boxShadow = "";
  tipo = "ingreso";
  tipoToggleBtn.textContent = "Ingreso";
  tipoToggleBtn.classList.remove("tipo-gasto");
  tipoToggleBtn.classList.add("tipo-ingreso");
}
