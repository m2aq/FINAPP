// Importa las funciones de Firebase que necesites
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";

// --- Configuración de Firebase ---
// ¡¡¡IMPORTANTE!!! Reemplaza estos valores con los de TU PROYECTO Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBqjHiWsBnK0AVUpE4arVqHmTI2B1udwaI", // <<< ¡TU API KEY REAL AQUÍ!
  authDomain: "inventario-ventas-c8c69.firebaseapp.com", // <<< TU AUTH DOMAIN REAL AQUÍ
  projectId: "inventario-ventas-c8c69", // <<< TU PROJECT ID REAL AQUÍ
  storageBucket: "inventario-ventas-c8c69.firebasestorage.app", // <<< TU STORAGE BUCKET REAL AQUÍ
  messagingSenderId: "1098853280661", // <<< TU MESSAGING SENDER ID REAL AQUÍ
  appId: "1:1098853280661:web:bb9efdb2bb09244c5ee49c" // <<< TU APP ID REAL AQUÍ
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Obtener el servicio Firestore
const db = getFirestore(app);
// Crear una referencia a la colección 'inventario' en Firestore
const inventarioCollectionRef = collection(db, 'inventario');

// --- Elementos del DOM ---
const inventarioForm = document.getElementById('inventario-form');
const inventarioList = document.getElementById('inventario-list');
const buscarInput = document.getElementById('buscar-input');

// --- Variables ---
let inventarioItems = []; // Almacena los items obtenidos de Firebase
let editingItemId = null; // ID del item que se está editando

// --- Funciones ---

// Cargar inventario desde Firebase y renderizarlo
async function cargarInventario(searchTerm = '') {
    inventarioList.innerHTML = '<li>Cargando inventario...</li>';
    inventarioItems = []; // Limpia el array local antes de cargar nuevos datos
    try {
        // Consulta para traer todos los datos. El filtrado se hace en el cliente para este ejemplo.
        // Para aplicaciones con muchísimos productos, se optimizaría la consulta en Firestore.
        const querySnapshot = await getDocs(inventarioCollectionRef);

        if (querySnapshot.empty) {
            inventarioList.innerHTML = '<li>No hay artículos en el inventario.</li>';
            return;
        }

        querySnapshot.forEach((doc) => {
            // Añade el ID del documento de Firebase al objeto del item para poder referenciarlo
            inventarioItems.push({ id: doc.id, ...doc.data() });
        });

        // Aplica el filtro si hay un término de búsqueda
        const filteredItems = searchTerm
            ? inventarioItems.filter(item =>
                item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.lote && item.lote.toLowerCase().includes(searchTerm.toLowerCase()))
              )
            : inventarioItems;

        renderInventario(filteredItems);

    } catch (error) {
        console.error("Error al cargar el inventario: ", error);
        inventarioList.innerHTML = '<li>Error al cargar inventario. Intenta de nuevo.</li>';
    }
}

// Renderiza la lista de items en el DOM
function renderInventario(itemsToRender = inventarioItems) {
    inventarioList.innerHTML = ''; // Limpia la lista actual antes de añadir los nuevos items
    if (itemsToRender.length === 0) {
        inventarioList.innerHTML = '<li>No hay artículos que coincidan con tu búsqueda.</li>';
        return;
    }
    itemsToRender.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.dataset.id = item.id; // Guarda el ID de Firebase para futuras operaciones (editar/eliminar)

        listItem.innerHTML = `
            <div class="item-info">
                <strong>${item.nombre}</strong>
                <br>
                <span>SKU: ${item.sku}</span>
                <span>Precio Público: $${item.precio_publico !== undefined ? item.precio_publico.toFixed(2) : 'N/A'}</span>
                ${item.lote ? `<span>Lote: ${item.lote}</span>` : ''}
                ${item.descripcion ? `<span>Desc: ${item.descripcion.substring(0, 50)}${item.descripcion.length > 50 ? '...' : ''}</span>` : ''}
            </div>
            <div class="item-actions">
                <button class="edit-btn" data-id="${item.id}">✏️</button>
                <button class="delete-btn" data-id="${item.id}">❌</button>
            </div>
        `;
        inventarioList.appendChild(listItem);
    });
}

// Maneja el envío del formulario para agregar o actualizar un artículo
inventarioForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sku = document.getElementById('sku').value.trim();
    const lote = document.getElementById('lote').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const inversion = parseFloat(document.getElementById('inversion').value);
    const precio_retail = parseFloat(document.getElementById('precio-retail').value) || 0; // Por defecto 0 si está vacío
    const precio_publico = parseFloat(document.getElementById('precio-publico').value);

    // Validación básica de campos obligatorios
    if (!sku || !nombre || isNaN(inversion) || isNaN(precio_publico)) {
        alert('Por favor, completa los campos obligatorios: SKU, Nombre, Inversión y Precio al Público.');
        return;
    }

    // Objeto con los datos del nuevo artículo
    const newItemData = {
        sku,
        lote,
        nombre,
        descripcion,
        inversion,
        precio_retail,
        precio_publico,
        fecha_agregado: new Date() // Opcional: añadir fecha de registro
    };

    try {
        if (editingItemId) { // Si estamos en modo de edición
            await updateDoc(doc(db, 'inventario', editingItemId), newItemData);
            alert('Artículo actualizado exitosamente.');
        } else { // Si estamos agregando un nuevo artículo
            await addDoc(inventarioCollectionRef, newItemData);
            alert('Artículo agregado exitosamente.');
        }
        inventarioForm.reset(); // Limpia el formulario después de agregar/actualizar
        editingItemId = null; // Resetea el modo de edición
        // Elimina el estilo de edición del item previamente editado si existe
        const currentlyEditingItem = document.querySelector('#inventario-list li.editing');
        if (currentlyEditingItem) {
            currentlyEditingItem.classList.remove('editing');
        }
        document.getElementById('sku').focus(); // Devuelve el foco al campo SKU
        await cargarInventario(); // Recarga la lista para mostrar los cambios
    } catch (error) {
        console.error("Error al guardar el artículo: ", error);
        alert('Hubo un error al guardar el artículo. Verifica tu conexión o la consola.');
    }
});

// Maneja los clics en los botones de editar o eliminar de cada item en la lista
inventarioList.addEventListener('click', async (e) => {
    const target = e.target;
    const itemId = target.dataset.id; // Obtiene el ID del item del atributo data-id

    if (!itemId) return; // Si el clic no fue en un elemento con data-id, no hacemos nada

    if (target.classList.contains('delete-btn')) { // Si se hizo clic en el botón de eliminar
        if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
            try {
                await deleteDoc(doc(db, 'inventario', itemId));
                alert('Artículo eliminado.');
                await cargarInventario(); // Recarga la lista para reflejar el cambio
            } catch (error) {
                console.error("Error al eliminar el artículo: ", error);
                alert('Hubo un error al eliminar el artículo. Verifica tu conexión o la consola.');
            }
        }
    } else if (target.classList.contains('edit-btn')) { // Si se hizo clic en el botón de editar
        // Encuentra el item en el array local de inventarioItems usando su ID
        const itemToEdit = inventarioItems.find(item => item.id === itemId);
        if (itemToEdit) {
            // Llena el formulario con los datos del item seleccionado para su edición
            document.getElementById('sku').value = itemToEdit.sku;
            document.getElementById('lote').value = itemToEdit.lote;
            document.getElementById('nombre').value = itemToEdit.nombre;
            document.getElementById('descripcion').value = itemToEdit.descripcion;
            // Manejo seguro para valores numéricos que podrían no estar definidos
            document.getElementById('inversion').value = itemToEdit.inversion !== undefined ? itemToItem.inversion.toFixed(2) : '';
            document.getElementById('precio-retail').value = itemToEdit.precio_retail !== undefined ? itemToEdit.precio_retail.toFixed(2) : '';
            document.getElementById('precio-publico').value = itemToEdit.precio_publico !== undefined ? itemToEdit.precio_publico.toFixed(2) : '';

            editingItemId = itemId; // Guarda el ID del item que se está editando para usarlo en la actualización

            // Resalta visualmente el item en la lista que está en modo de edición
            const currentlyEditingItem = document.querySelector('#inventario-list li.editing');
            if (currentlyEditingItem) {
                currentlyEditingItem.classList.remove('editing');
            }
            const listItem = target.closest('li'); // Busca el elemento 'li' más cercano al botón clicado
            if (listItem) {
                listItem.classList.add('editing'); // Añade la clase para resaltar
            }
            document.getElementById('nombre').focus(); // Mueve el foco al campo Nombre para facilitar la edición
        }
    }
});

// Evento para el campo de búsqueda: filtra los items en tiempo real
buscarInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    cargarInventario(searchTerm); // Llama a cargarInventario para filtrar y renderizar los resultados
});

// --- Inicialización ---
// Registro del Service Worker para funcionalidad PWA (offline, instalación)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/sw.js') // Ruta correcta al Service Worker
        .then(function(registration) {
            console.log('Service Worker registrado con éxito:', registration.scope);
        })
        .catch(function(err) {
            console.log('Fallo al registrar Service Worker:', err);
        });
}

// Carga inicial del inventario cuando la aplicación arranca
cargarInventario();
