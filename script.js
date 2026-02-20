const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";
let alertasActivas = {};

function verificarReinicioDiario() {
    const fechaActual = new Date().toLocaleDateString();
    const ultimaFecha = localStorage.getItem("ultima_fecha_actividad");
    if (ultimaFecha && ultimaFecha !== fechaActual) {
        localStorage.clear();
        location.reload();
    }
    localStorage.setItem("ultima_fecha_actividad", fechaActual);
}

document.addEventListener("DOMContentLoaded", async () => {
    verificarReinicioDiario();
    const logsPrevios = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    const contenedor = document.getElementById("logContainer");
    if(contenedor) {
        logsPrevios.forEach(log => {
            const div = document.createElement("div");
            div.className = `mb-1 ${log.clase}`;
            div.innerHTML = log.texto;
            contenedor.appendChild(div);
        });
        contenedor.scrollTop = contenedor.scrollHeight;
    }
    await actualizarDatos(); 
    setInterval(actualizarDatos, 5000); 
    registrarLog("Sistema de monitoreo diario activo", "success");
});

async function actualizarDatos() {
    try {
        const res = await fetch(API_URL);
        const datos = await res.json();
        renderAdmin(datos);
        renderControl(datos);
        renderMonitoreo(datos);

        // RE-APLICAR FILTRO después de actualizar
        const busqueda = document.getElementById("buscadorPuertas").value;
        if (busqueda && busqueda.trim() !== "") {
            filtrarPuertas(); 
        }
    } catch (e) { 
        console.error("Error API:", e); 
        registrarLog("Error de conexión con la API externa", "danger");
    }
}

// FUNCIONES DEL BUSCADOR (X famosísima integrada)
function manejarBusqueda() {
    const input = document.getElementById("buscadorPuertas");
    const btnX = document.getElementById("btnLimpiar");
    input.value.length > 0 ? btnX.classList.remove("d-none") : btnX.classList.add("d-none");
    filtrarPuertas();
}

function limpiarBuscador() {
    const input = document.getElementById("buscadorPuertas");
    input.value = "";
    document.getElementById("btnLimpiar").classList.add("d-none");
    filtrarPuertas();
    input.focus();
}

function filtrarPuertas() {
    const texto = document.getElementById("buscadorPuertas").value.toLowerCase();
    const tarjetas = document.querySelectorAll("#contenedorControl .col-md-4");
    tarjetas.forEach(t => {
        const nombre = t.querySelector("h5").innerText.toLowerCase();
        t.style.display = nombre.includes(texto) ? "block" : "none";
    });
}

// RENDERIZADOS
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return; tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `<tr><td class="ps-4"><div class="fw-bold text-black text-start">${p.nombre}</div><small class="text-muted">ID: ${p.id}</small></td><td class="text-start text-muted">${p.ubicacion}</td><td class="text-end pe-4"><button class="btn btn-sm text-warning" onclick="prepararEdicion('${p.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm text-danger" onclick="eliminarPuerta('${p.id}')"><i class="bi bi-trash"></i></button></td></tr>`;
    });
}

function renderControl(puertas) {
    const contenedor = document.getElementById("contenedorControl");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    puertas.forEach(p => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card card-access h-100 p-4 text-center">
                    <div class="mb-3"><i class="bi ${p.estado ? 'bi-shield-exclamation text-warning' : 'bi-shield-check text-success'} fs-1"></i></div>
                    <h5 class="fw-bold text-white mb-1">${p.nombre}</h5>
                    <p class="small fw-bold" style="color: ${p.estado ? '#ffc107' : '#00ca72'}">${p.estado ? 'ACCESO ABIERTO' : 'TOTALMENTE PROTEGIDO'}</p>
                    
                    <div class="mt-2">
                        <small class="text-white-50 fw-bold d-block mb-2">ID: ${p.id}</small>
                        <div class="form-check form-switch d-flex justify-content-center">
                            <input class="form-check-input" type="checkbox" style="width:3em; height:1.5em; cursor:pointer" 
                            ${p.estado ? 'checked' : ''} onclick="togglePuerta('${p.id}', ${p.estado})">
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function renderMonitoreo(puertas) {
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla) return; tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `<tr class="align-middle"><td class="ps-4 text-start"><div class="fw-bold text-black mb-0" style="cursor: pointer; text-decoration: underline;" onclick="verDetalles('${p.id}')">${p.nombre || 'ID: '+p.id}</div></td><td><span class="badge rounded-pill border border-success text-success py-2 px-3">${p.estado ? 'ABIERTO' : 'SEGURO'}</span></td><td><div class="d-flex align-items-center"><div class="progress flex-grow-1 me-2" style="height:8px"><div class="progress-bar" style="width:${p.bateria}%"></div></div><span class="small fw-bold text-black">${p.bateria}%</span></div></td><td class="text-muted small">${p.fecha_act || '---'}</td><td class="fw-bold text-black">${p.hora_apertura || '--:--'}</td><td class="fw-bold text-black">${p.hora_cierre || '--:--'}</td></tr>`;
    });
}

async function togglePuerta(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString();
    let datos = { estado: nuevoEstado, fecha_act: ahora.toLocaleDateString() };
    if (nuevoEstado) {
        datos.hora_apertura = hora;
        registrarLog(`Acceso concedido en dispositivo ID: ${id}`, "warning");
        alertasActivas[id] = setTimeout(async () => {
            const res = await fetch(`${API_URL}/${id}`);
            const p = await res.json();
            if (p.estado) { alert(`⚠️ SEGURIDAD: "${p.nombre}" abierta demasiado tiempo.`); registrarLog(`Alerta crítica: Puerta ${id} abierta demasiado tiempo`, "danger"); }
        }, 10000);
    } else {
        datos.hora_cierre = hora;
        registrarLog(`Acceso cerrado en dispositivo ID: ${id}`, "success");
        if (alertasActivas[id]) { clearTimeout(alertasActivas[id]); delete alertasActivas[id]; }
    }
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
    actualizarDatos();
}

function registrarLog(mensaje, tipo = "info") {
    const contenedor = document.getElementById("logContainer");
    const contador = document.getElementById("logCounter");
    if(!contenedor) return;
    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString();
    let color = "text-white-50";
    if(tipo === "success") color = "text-success";
    if(tipo === "warning") color = "text-warning";
    if(tipo === "danger") color = "text-danger";
    const textoLog = `[${tiempo}] > ${mensaje.toUpperCase()}`;
    let logsGuardados = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    logsGuardados.push({ texto: textoLog, clase: color });
    localStorage.setItem("logs_sistema", JSON.stringify(logsGuardados));
    const nuevoLog = document.createElement("div");
    nuevoLog.className = `mb-1 ${color}`;
    nuevoLog.innerHTML = textoLog;
    contenedor.appendChild(nuevoLog);
    contenedor.scrollTop = contenedor.scrollHeight;
    contador.innerText = `${logsGuardados.length} EVENTOS`;
}

function descargarReporte() {
    const logs = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    if (logs.length === 0) { alert("Sin datos."); return; }
    let csvContent = "FECHA Y HORA,DESCRIPCION\n";
    logs.forEach(log => {
        let fila = log.texto.replace("[", "").replace("]", "").replace(" > ", ",");
        csvContent += fila + "\n";
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bitacora_Seguridad_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// CRUD y Detalles omitidos por brevedad pero se mantienen igual que en tu código original
async function crearPuerta() {
    const n = document.getElementById("nombreP").value;
    const u = document.getElementById("ubicacionP").value;
    if(!n || !u) return;
    await fetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nombre: n, ubicacion: u, estado: false, bateria: 100, fecha_act: new Date().toLocaleDateString() }) });
    actualizarDatos();
}

async function eliminarPuerta(id) {
    if(!confirm("¿Eliminar?")) return;
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    actualizarDatos();
}

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

async function verDetalles(id) {
    const res = await fetch(`${API_URL}/${id}`);
    const p = await res.json();
    const cuerpo = document.getElementById("cuerpoTablaDetalle");
    cuerpo.innerHTML = "";
    let listaA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
    let listaC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
    for(let i = 0; i < 10; i++) {
        cuerpo.innerHTML += `<tr><td>${p.fecha_act || '---'}</td><td class="text-success">${listaA[i] || '---'}</td><td class="text-danger">${listaC[i] || '---'}</td></tr>`;
    }
    document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
    document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}