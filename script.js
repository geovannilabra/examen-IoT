const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";

document.addEventListener("DOMContentLoaded", () => {
    actualizarDatos();
    setInterval(actualizarDatos, 2000); 
});

async function actualizarDatos() {
    try {
        const res = await fetch(API_URL);
        const datos = await res.json();
        renderAdmin(datos);
        renderControl(datos);
        renderMonitoreo(datos);
    } catch (e) { console.error("Error:", e); }
}

function filtrarPuertas() {
    const texto = document.getElementById("buscadorPuertas").value.toLowerCase();
    const tarjetas = document.querySelectorAll("#contenedorControl .col-md-4");
    tarjetas.forEach(t => {
        const nombre = t.querySelector("h6").innerText.toLowerCase();
        t.style.display = nombre.includes(texto) ? "block" : "none";
    });
}

// RENDER ADMIN CON BOTÓN EDITAR
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `<tr>
            <td>${p.nombre}</td><td>${p.ubicacion}</td>
            <td>
                <button class="btn btn-outline-warning btn-sm me-1" onclick="prepararEdicion('${p.id}')">Editar</button>
                <button class="btn btn-outline-danger btn-sm" onclick="eliminarPuerta('${p.id}')">Baja</button>
            </td>
        </tr>`;
    });
}

// LÓGICA DE EDICIÓN
async function prepararEdicion(id) {
    const res = await fetch(`${API_URL}/${id}`);
    const p = await res.json();
    document.getElementById("editId").value = p.id;
    document.getElementById("editNombre").value = p.nombre;
    document.getElementById("editUbicacion").value = p.ubicacion;
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
}

async function guardarCambios() {
    const id = document.getElementById("editId").value;
    const n = document.getElementById("editNombre").value;
    const u = document.getElementById("editUbicacion").value;
    
    await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nombre: n, ubicacion: u })
    });
    bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
    actualizarDatos();
}

async function crearPuerta() {
    const n = document.getElementById("nombreP").value;
    const u = document.getElementById("ubicacionP").value;
    if(!n || !u) return;
    await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nombre: n, ubicacion: u, estado: false, bateria: 100, fecha_act: new Date().toLocaleDateString() })
    });
    document.getElementById("nombreP").value = "";
    document.getElementById("ubicacionP").value = "";
    actualizarDatos();
}

async function eliminarPuerta(id) {
    if(!confirm("¿Borrar historial de auditoría?")) return;
    localStorage.removeItem(`contador_abrir_${id}`);
    localStorage.removeItem(`contador_cerrar_${id}`);
    localStorage.removeItem(`lista_A_${id}`);
    localStorage.removeItem(`lista_C_${id}`);
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    actualizarDatos();
}

function renderControl(puertas) {
    const contenedor = document.getElementById("contenedorControl");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    puertas.forEach(p => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="card text-center shadow-sm border-${p.estado ? 'success' : 'secondary'}">
                    <div class="card-body">
                        <h6 class="fw-bold text-uppercase">${p.nombre}</h6>
                        <div class="form-check form-switch d-inline-block">
                            <input class="form-check-input" type="checkbox" style="transform: scale(1.5);" 
                            ${p.estado ? 'checked' : ''} onclick="togglePuerta('${p.id}', ${p.estado})">
                        </div>
                        <p class="mt-2 ${p.estado ? 'text-success' : 'text-danger'} fw-bold small">
                            ${p.estado ? '🟢 ACCESO AUTORIZADO' : '🔴 ÁREA ASEGURADA'}
                        </p>
                    </div>
                </div>
            </div>`;
    });
    filtrarPuertas();
}

async function togglePuerta(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString();
    let datos = { estado: nuevoEstado, fecha_act: ahora.toLocaleDateString() };

    if (nuevoEstado) {
        datos.hora_apertura = hora;
        let hA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
        hA.unshift(hora);
        localStorage.setItem(`lista_A_${id}`, JSON.stringify(hA.slice(0, 10)));
        localStorage.setItem(`contador_abrir_${id}`, (parseInt(localStorage.getItem(`contador_abrir_${id}`)) || 0) + 1);
    } else {
        datos.hora_cierre = hora;
        let hC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        hC.unshift(hora);
        localStorage.setItem(`lista_C_${id}`, JSON.stringify(hC.slice(0, 10)));
        localStorage.setItem(`contador_cerrar_${id}`, (parseInt(localStorage.getItem(`contador_cerrar_${id}`)) || 0) + 1);
    }
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
    actualizarDatos();
}

function renderMonitoreo(puertas) {
    const grafico = document.getElementById("contenedorGrafico");
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla || !grafico) return;

    // Limpiamos el contenedor de las barras de arriba para que no estorben
    grafico.innerHTML = ""; 
    tabla.innerHTML = "";

    puertas.forEach(p => {
        // Metemos la lógica de la batería directamente en una celda de la tabla
        tabla.innerHTML += `
            <tr>
                <td class="text-primary fw-bold text-start" style="cursor:pointer;" onclick="verDetalles('${p.id}')">
                    🔍 ${p.nombre}
                </td>
                <td>
                    <span class="badge ${p.estado ? 'bg-success' : 'bg-secondary'}">
                        ${p.estado ? 'ABIERTO' : 'SEGURO'}
                    </span>
                </td>
                <td style="min-width: 120px;">
                    <div class="d-flex align-items-center">
                        <div class="progress w-100 me-2" style="height: 10px;">
                            <div class="progress-bar ${p.bateria < 20 ? 'bg-danger' : 'bg-primary'}" 
                                 style="width: ${p.bateria}%">
                            </div>
                        </div>
                        <small class="fw-bold">${p.bateria}%</small>
                    </div>
                </td>
                <td>${p.fecha_act || "---"}</td>
                <td>${p.hora_apertura || "---"}</td>
                <td>${p.hora_cierre || "---"}</td>
            </tr>`;
    });
}

async function verDetalles(id) {
    const res = await fetch(`${API_URL}/${id}`);
    const p = await res.json();
    document.getElementById("tituloModal").innerText = `Auditoría: ${p.nombre}`;
    const cuerpo = document.getElementById("cuerpoTablaDetalle");
    cuerpo.innerHTML = "";
    let listaA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
    let listaC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
    for(let i = 0; i < 10; i++) {
        cuerpo.innerHTML += `<tr><td>${p.fecha_act}</td><td class="text-primary">${listaA[i] || "---"}</td><td class="text-danger">${listaC[i] || "---"}</td></tr>`;
    }
    document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
    document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}