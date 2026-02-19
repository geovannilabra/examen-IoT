const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";
let alertasActivas = {};
let totalLogs = 0; // Movido afuera para acceso global

// Inicialización del sistema
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Ejecutamos inmediatamente para que no tarde nada en iniciar
    await actualizarDatos(); 
    
    // 2. Registramos el inicio en la auditoría
    registrarLog("Framework de seguridad activo - Monitoreo iniciado", "success");

    // 3. Dejamos el intervalo solo para las actualizaciones automáticas cada 5s
    setInterval(actualizarDatos, 5000); 
});

// Obtención de datos de la API
async function actualizarDatos() {
    try {
        const res = await fetch(API_URL);
        const datos = await res.json();
        renderAdmin(datos);
        renderControl(datos);
        renderMonitoreo(datos);
    } catch (e) { 
        console.error("Error al conectar con la API:", e); 
        registrarLog("Error de conexión con la API externa", "danger");
    }
}

// SECCIÓN 1: ADMINISTRACIÓN (CRUD)
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-white text-start">${p.nombre}</div>
                    <small class="text-muted d-block text-start">ID: ${p.id}</small>
                </td>
                <td class="text-start text-muted">
                    <i class="bi bi-geo-alt me-1"></i>${p.ubicacion}
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm text-warning" onclick="prepararEdicion('${p.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm text-danger" onclick="eliminarPuerta('${p.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// SECCIÓN 2: PANEL DE AUTORIZACIÓN (TARJETAS ESTILO AVG)
function renderControl(puertas) {
    const contenedor = document.getElementById("contenedorControl");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    puertas.forEach(p => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card card-access h-100 p-4 text-center">
                    <div class="mb-3">
                        <i class="bi ${p.estado ? 'bi-shield-exclamation text-warning' : 'bi-shield-check text-success'} fs-1"></i>
                    </div>
                    <h5 class="fw-bold text-white mb-1">${p.nombre}</h5>
                    <p class="small fw-bold" style="color: ${p.estado ? '#ffc107' : '#00ca72'}">
                        ${p.estado ? 'ACCESO ABIERTO' : 'TOTALMENTE PROTEGIDO'}
                    </p>
                    <div class="d-flex justify-content-center mt-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" style="width:3em; height:1.5em; cursor:pointer" 
                            ${p.estado ? 'checked' : ''} onclick="togglePuerta('${p.id}', ${p.estado})">
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

// SECCIÓN 3: MONITOREO (CON VÍNCULO AL HISTORIAL)
function renderMonitoreo(puertas) {
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr class="align-middle">
                <td class="ps-4 text-start">
                    <div class="fw-bold text-white mb-0" 
                         style="cursor: pointer; text-decoration: underline;" 
                         onclick="verDetalles('${p.id}')">
                         ${p.nombre || 'Área ' + p.id}
                    </div>
                    <small class="text-muted">ID: ${p.id}</small>
                </td>
                <td>
                    <span class="badge rounded-pill border border-success text-success py-2 px-3">
                        ${p.estado ? 'ABIERTO' : 'SEGURO'}
                    </span>
                </td>
                <td>
                    <div class="d-flex align-items-center" style="min-width:140px">
                        <div class="progress flex-grow-1 me-2" style="height:8px">
                            <div class="progress-bar" style="width:${p.bateria}%"></div>
                        </div>
                        <span class="small fw-bold text-white">${p.bateria}%</span>
                    </div>
                </td>
                <td class="text-muted small">${p.fecha_act || '---'}</td>
                <td class="fw-bold text-white">${p.hora_apertura || '--:--'}</td>
                <td class="fw-bold text-white">${p.hora_cierre || '--:--'}</td>
            </tr>`;
    });
}

// LÓGICA DE CONTROL Y NOTIFICACIÓN DE 10 SEG
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

        // Registro en Auditoría
        registrarLog(`Acceso concedido en dispositivo ID: ${id}`, "warning");

        alertasActivas[id] = setTimeout(async () => {
            const res = await fetch(`${API_URL}/${id}`);
            const p = await res.json();
            if (p.estado) {
                alert(`⚠️ SEGURIDAD: "${p.nombre}" ha permanecido abierta por más de 10 segundos.`);
                registrarLog(`Alerta crítica: Puerta ${id} abierta por tiempo excesivo`, "danger");
            }
        }, 10000);
    } else {
        datos.hora_cierre = hora;
        let hC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        hC.unshift(hora);
        localStorage.setItem(`lista_C_${id}`, JSON.stringify(hC.slice(0, 10)));
        localStorage.setItem(`contador_cerrar_${id}`, (parseInt(localStorage.getItem(`contador_cerrar_${id}`)) || 0) + 1);

        // Registro en Auditoría
        registrarLog(`Acceso cerrado y asegurado en dispositivo ID: ${id}`, "success");

        if (alertasActivas[id]) { 
            clearTimeout(alertasActivas[id]); 
            delete alertasActivas[id]; 
        }
    }

    await fetch(`${API_URL}/${id}`, { 
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(datos) 
    });
    actualizarDatos();
}

async function verDetalles(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const p = await res.json();
        const cuerpoTabla = document.getElementById("cuerpoTablaDetalle");
        cuerpoTabla.innerHTML = "";
        
        let listaA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
        let listaC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        
        for(let i = 0; i < 10; i++) {
            cuerpoTabla.innerHTML += `
                <tr>
                    <td class="text-muted small">${p.fecha_act || new Date().toLocaleDateString()}</td>
                    <td class="text-success fw-bold">${listaA[i] || '---'}</td>
                    <td class="text-danger fw-bold">${listaC[i] || '---'}</td>
                </tr>`;
        }
        
        document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
        document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;
        
        registrarLog(`Consultando historial de ID: ${id}`, "info");
        new bootstrap.Modal(document.getElementById('modalDetalle')).show();
    } catch (e) {
        console.error("Error visualizando historial:", e);
    }
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
    registrarLog(`Nuevo punto de acceso registrado: "${n}"`, "success");
}

async function eliminarPuerta(id) {
    if(!confirm("¿Desea eliminar este dispositivo de seguridad?")) return;
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    actualizarDatos();
    registrarLog(`Eliminación forzada de dispositivo ID: ${id}`, "danger");
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
    await fetch(`${API_URL}/${id}`, { 
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ nombre: n, ubicacion: u }) 
    });
    bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
    actualizarDatos();
    registrarLog(`Modificación de parámetros en ID: ${id}`, "warning");
}

function filtrarPuertas() {
    const texto = document.getElementById("buscadorPuertas").value.toLowerCase();
    const tarjetas = document.querySelectorAll("#contenedorControl .col-md-4");
    tarjetas.forEach(t => {
        const nombre = t.querySelector("h5").innerText.toLowerCase();
        t.style.display = nombre.includes(texto) ? "block" : "none";
    });
}

// FUNCIÓN DE LOGS (CORRECTAMENTE UBICADA)
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

    const nuevoLog = document.createElement("div");
    nuevoLog.className = `mb-1 ${color}`;
    nuevoLog.innerHTML = `<span>[${tiempo}]</span> > ${mensaje.toUpperCase()}`;
    
    contenedor.appendChild(nuevoLog);
    contenedor.scrollTop = contenedor.scrollHeight;

    totalLogs++;
    contador.innerText = `${totalLogs} EVENTOS`;
}