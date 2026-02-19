const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";

document.addEventListener("DOMContentLoaded", () => {
    actualizarDatos();
    setInterval(actualizarDatos, 3000); 
});

async function actualizarDatos() {
    try {
        const res = await fetch(API_URL);
        const datos = await res.json();
        renderAdmin(datos);
        renderControl(datos);
        renderMonitoreo(datos);
    } catch (e) { console.error("Error en API:", e); }
}

// FILTRADO DINÁMICO
function filtrarPuertas() {
    const texto = document.getElementById("buscadorPuertas").value.toLowerCase();
    const tarjetas = document.querySelectorAll("#contenedorControl .col-md-4");
    tarjetas.forEach(t => {
        const nombre = t.querySelector("h5").innerText.toLowerCase();
        t.style.display = nombre.includes(texto) ? "block" : "none";
    });
}

// SECCIÓN 1: ADMIN CRUD
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${p.nombre}</div>
                    <small class="text-muted" style="font-size: 0.65rem;">ID: ${p.id}</small>
                </td>
                <td><span class="text-muted"><i class="bi bi-geo-alt"></i> ${p.ubicacion}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-outline-warning btn-sm border-0" onclick="prepararEdicion('${p.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm border-0" onclick="eliminarPuerta('${p.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// SECCIÓN 2: CARDS DE AUTORIZACIÓN
function renderControl(puertas) {
    const contenedor = document.getElementById("contenedorControl");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    puertas.forEach(p => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card card-access h-100 shadow-sm p-3">
                    <div class="d-flex justify-content-between mb-3">
                        <span class="badge ${p.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill px-3">
                            ${p.estado ? '● AUTORIZADO' : '● ASEGURADO'}
                        </span>
                        <i class="bi bi-shield-lock text-muted"></i>
                    </div>
                    <h5 class="fw-bold mb-1 text-start">${p.nombre}</h5>
                    <p class="small text-muted mb-4 text-start">${p.ubicacion}</p>
                    <div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-4">
                        <span class="small fw-bold">${p.estado ? 'CERRAR' : 'ABRIR'} ACCESO</span>
                        <div class="form-check form-switch m-0">
                            <input class="form-check-input" type="checkbox" style="width: 2.5em; height: 1.25em; cursor:pointer;" 
                            ${p.estado ? 'checked' : ''} onclick="togglePuerta('${p.id}', ${p.estado})">
                        </div>
                    </div>
                </div>
            </div>`;
    });
    filtrarPuertas();
}

// SECCIÓN 3: MONITOREO (CON BATERÍA EN TABLA)
function renderMonitoreo(puertas) {
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr class="align-middle">
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary-subtle text-primary p-2 rounded-3 me-3"><i class="bi bi-broadcast"></i></div>
                        <div>
                            <div class="fw-bold text-primary" style="cursor:pointer" onclick="verDetalles('${p.id}')">${p.nombre}</div>
                            <small class="text-muted">${p.ubicacion}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${p.estado ? 'bg-success' : 'bg-dark'} w-100 py-2">${p.estado ? 'ABIERTO' : 'SEGURO'}</span></td>
                <td>
                    <div class="d-flex align-items-center" style="min-width: 140px;">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar ${p.bateria < 25 ? 'bg-danger' : 'bg-success'}" style="width: ${p.bateria}%"></div>
                        </div>
                        <span class="small fw-bold">${p.bateria}%</span>
                    </div>
                </td>
                <td class="small text-muted">${p.fecha_act || '---'}</td>
                <td class="fw-bold text-dark">${p.hora_apertura || '--:--'}</td>
                <td class="fw-bold text-dark">${p.hora_cierre || '--:--'}</td>
            </tr>`;
    });
}

// LÓGICA DE AUDITORÍA (LOCALSTORAGE)
async function togglePuerta(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString();
    let datos = { estado: nuevoEstado, fecha_act: ahora.toLocaleDateString() };

    if (nuevoEstado) {
        datos.hora_apertura = hora;
        let hA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
        hA.unshift(hora);
        localStorage.setItem(`lista_A_${id}`, JSON.stringify(hA.slice(0, 5)));
        localStorage.setItem(`contador_abrir_${id}`, (parseInt(localStorage.getItem(`contador_abrir_${id}`)) || 0) + 1);
    } else {
        datos.hora_cierre = hora;
        let hC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        hC.unshift(hora);
        localStorage.setItem(`lista_C_${id}`, JSON.stringify(hC.slice(0, 5)));
        localStorage.setItem(`contador_cerrar_${id}`, (parseInt(localStorage.getItem(`contador_cerrar_${id}`)) || 0) + 1);
    }
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
    actualizarDatos();
}

// FUNCIONES CRUD RESTANTES (EDITAR/ELIMINAR/CREAR)
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
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nombre: n, ubicacion: u }) });
    bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
    actualizarDatos();
}

async function crearPuerta() {
    const n = document.getElementById("nombreP").value;
    const u = document.getElementById("ubicacionP").value;
    if(!n || !u) return;
    await fetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nombre: n, ubicacion: u, estado: false, bateria: 100, fecha_act: new Date().toLocaleDateString() }) });
    document.getElementById("nombreP").value = ""; document.getElementById("ubicacionP").value = "";
    actualizarDatos();
}

async function eliminarPuerta(id) {
    if(!confirm("¿Dar de baja este dispositivo de seguridad?")) return;
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    actualizarDatos();
}

async function verDetalles(id) {
    const res = await fetch(`${API_URL}/${id}`);
    const p = await res.json();
    document.getElementById("cuerpoTablaDetalle").innerHTML = "";
    let listaA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
    let listaC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
    for(let i = 0; i < 5; i++) {
        document.getElementById("cuerpoTablaDetalle").innerHTML += `<tr><td>${p.fecha_act}</td><td class="text-success">${listaA[i] || '---'}</td><td class="text-danger">${listaC[i] || '---'}</td></tr>`;
    }
    document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
    document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}