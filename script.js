// ============================================
// CONFIGURA ESTO: pega la URL de tu Web App de Apps Script
// (termina en /exec)
// ============================================
const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbwv6hQCKk1M36u5lmXTcCkeGKGDqRd_cu7UaREHKgCLC2bVDlD9AOGY0B1qqYyXJ_984w/exec';

let codigosDisponibles = []; // [{codigo, descripcion}, ...]

const contenedorProductos = document.getElementById('productos');
const plantilla = document.getElementById('plantillaProducto');
const datalist = document.getElementById('listaCodigos');
const mensaje = document.getElementById('mensaje');

// 1. Cargar el listado de códigos al abrir la página
async function cargarCodigos() {
  try {
    const resp = await fetch(`${URL_APPS_SCRIPT}?action=codigos`);
    const data = await resp.json();
    if (data.status === 'ok') {
      codigosDisponibles = data.codigos;
      datalist.innerHTML = codigosDisponibles
        .map(c => `<option value="${c.codigo}">${c.descripcion}</option>`)
        .join('');
    }
  } catch (err) {
    mostrarMensaje('No se pudo cargar el listado de códigos. Verifica la conexión.', 'error');
  }
}

// 2. Crear un bloque de producto nuevo
function agregarProducto() {
  const nodo = plantilla.content.cloneNode(true);
  const div = nodo.querySelector('.producto');

  const inputCodigo = div.querySelector('.input-codigo');
  const inputDescripcion = div.querySelector('.input-descripcion');
  const btnQuitar = div.querySelector('.btn-quitar');
  const inputArchivo = div.querySelector('.input-ref-imagen');
  const nombreArchivo = div.querySelector('.nombre-archivo');

  inputArchivo.addEventListener('change', () => {
    nombreArchivo.textContent = inputArchivo.files[0]
      ? inputArchivo.files[0].name
      : 'Ningún archivo seleccionado';
  });

  // Autocompletar descripción según el código escrito/seleccionado
  inputCodigo.addEventListener('input', () => {
    const encontrado = codigosDisponibles.find(
      c => c.codigo.toLowerCase() === inputCodigo.value.trim().toLowerCase()
    );
    inputDescripcion.value = encontrado ? encontrado.descripcion : '';
  });

  btnQuitar.addEventListener('click', () => {
    if (contenedorProductos.children.length > 1) {
      div.remove();
    } else {
      mostrarMensaje('Debe quedar al menos un producto.', 'error');
    }
  });

  contenedorProductos.appendChild(div);
}

// 3. Convertir un archivo de imagen a base64
function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result.split(',')[1]);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

// 4. Armar y enviar la solicitud
async function enviarSolicitud(e) {
  e.preventDefault();
  const btnEnviar = document.getElementById('btnEnviar');
  btnEnviar.disabled = true;
  mostrarMensaje('Enviando solicitud...', '');

  const dni = document.getElementById('dni').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const bloquesProducto = document.querySelectorAll('.producto');

  try {
    const items = [];
    for (const bloque of bloquesProducto) {
      const codigo = bloque.querySelector('.input-codigo').value.trim();
      const descripcion = bloque.querySelector('.input-descripcion').value.trim();
      const cantidad = bloque.querySelector('.input-cantidad').value;
      const unidad = bloque.querySelector('.input-unidad').value;

      const item = { codigo, descripcion, cantidad, unidad };
      item.referenciaTexto = bloque.querySelector('.input-ref-texto').value.trim();

      // El docente puede llenar texto, subir imagen, o ambos a la vez
      const archivo = bloque.querySelector('.input-ref-imagen').files[0];
      if (archivo) {
        item.imagenBase64 = await archivoABase64(archivo);
        item.imagenNombre = archivo.name;
        item.imagenTipo = archivo.type;
      }

      items.push(item);
    }

    // Content-Type text/plain evita el preflight CORS con Apps Script
    const resp = await fetch(URL_APPS_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ dni, correo, items })
    });
    const data = await resp.json();

    if (data.status === 'ok') {
      mostrarMensaje('Solicitud enviada correctamente.', 'exito');
      document.getElementById('formSolicitud').reset();
      contenedorProductos.innerHTML = '';
      agregarProducto();
    } else {
      mostrarMensaje('Error: ' + data.mensaje, 'error');
    }
  } catch (err) {
    mostrarMensaje('No se pudo enviar la solicitud. Intenta de nuevo.', 'error');
  } finally {
    btnEnviar.disabled = false;
  }
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo;
}

document.getElementById('btnAgregar').addEventListener('click', agregarProducto);
document.getElementById('formSolicitud').addEventListener('submit', enviarSolicitud);

cargarCodigos();
agregarProducto(); // primer producto visible al cargar
