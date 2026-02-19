const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";
let alertasActivas = {};
let totalLogs = 0; 

function verificarReinicioDiario() {
    const fechaActual = new Date().toLocaleDateString();
    const ultimaFechaGuardada = localStorage.getItem("ultima_fecha_actividad");

    // Si existe una fecha guardada y es diferente a la de hoy, reiniciamos todo
    if (ultimaFechaGuardada && ultimaFechaGuardada !== fechaActual) {
        // Borrar logs de terminal
        localStorage.removeItem("logs_sistema");
        // Borrar contadores de las puertas (aperturas/cierres)
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes("contador_") || key.includes("lista_") || key.includes("conteo_total")) {
                localStorage.removeItem(key);
            }
        });
        
        console.log("Sistema reiniciado: Nuevo día detectado.");
        location.reload(); // Recarga la página para mostrar todo en cero
    }

    // Actualizar la fecha de hoy como la última fecha de actividad
    localStorage.setItem("ultima_fecha_actividad", fechaActual);
}




// Inicialización del sistema
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verificar si cambió el día antes de cargar nada
    verificarReinicioDiario();

    // 2. Cargar logs guardados del día actual
    const logsPrevios = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    const contenedor = document.getElementById("logContainer");
    
    if(contenedor) {
        // Aquí cargamos TODO el historial del día en la terminal
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

// SECCIONES DE RENDERIZADO
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-black text-start">${p.nombre}</div>
                    <small class="text-muted d-block text-start">ID: ${p.id}</small>
                </td>
                <td class="text-start text-muted"><i class="bi bi-geo-alt me-1"></i>${p.ubicacion}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm text-warning" onclick="prepararEdicion('${p.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm text-danger" onclick="eliminarPuerta('${p.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
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

function renderMonitoreo(puertas) {
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `
            <tr class="align-middle">
                <td class="ps-4 text-start">
                    <div class="fw-bold text-black mb-0" style="cursor: pointer; text-decoration: underline;" onclick="verDetalles('${p.id}')">${p.nombre || 'Área ' + p.id}</div>
                    <small class="text-muted">ID: ${p.id}</small>
                </td>
                <td><span class="badge rounded-pill border border-success text-success py-2 px-3">${p.estado ? 'ABIERTO' : 'SEGURO'}</span></td>
                <td>
                    <div class="d-flex align-items-center" style="min-width:140px">
                        <div class="progress flex-grow-1 me-2" style="height:8px"><div class="progress-bar" style="width:${p.bateria}%"></div></div>
                        <span class="small fw-bold text-black">${p.bateria}%</span>
                    </div>
                </td>
                <td class="text-muted small">${p.fecha_act || '---'}</td>
                <td class="fw-bold text-black">${p.hora_apertura || '--:--'}</td>
                <td class="fw-bold text-black">${p.hora_cierre || '--:--'}</td>
            </tr>`;
    });
}

// LOGICA DE CONTROL Y CRUD
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
        registrarLog(`Acceso cerrado y asegurado en dispositivo ID: ${id}`, "success");
        if (alertasActivas[id]) { clearTimeout(alertasActivas[id]); delete alertasActivas[id]; }
    }

    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
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
            cuerpoTabla.innerHTML += `<tr><td class="text-muted small">${p.fecha_act || new Date().toLocaleDateString()}</td><td class="text-success fw-bold">${listaA[i] || '---'}</td><td class="text-danger fw-bold">${listaC[i] || '---'}</td></tr>`;
        }
        document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
        document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;
        registrarLog(`Consultando historial de ID: ${id}`, "info");
        new bootstrap.Modal(document.getElementById('modalDetalle')).show();
    } catch (e) { console.error(e); }
}

async function crearPuerta() {
    const n = document.getElementById("nombreP").value;
    const u = document.getElementById("ubicacionP").value;
    if(!n || !u) return;
    await fetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nombre: n, ubicacion: u, estado: false, bateria: 100, fecha_act: new Date().toLocaleDateString() }) });
    document.getElementById("nombreP").value = ""; 
    document.getElementById("ubicacionP").value = "";
    actualizarDatos();
    registrarLog(`Nuevo punto de acceso registrado: "${n}"`, "success");
}

async function eliminarPuerta(id) {
    if(!confirm("¿Desea eliminar este dispositivo?")) return;
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
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ nombre: n, ubicacion: u }) });
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

// SISTEMA DE AUDITORÍA Y EXPORTACIÓN
function registrarLog(mensaje, tipo = "info") {
    const contenedor = document.getElementById("logContainer");
    const contador = document.getElementById("logCounter");
    if(!contenedor) return;

    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString(); // Formato 24h
    
    let color = "text-white-50";
    if(tipo === "success") color = "text-success";
    if(tipo === "warning") color = "text-warning";
    if(tipo === "danger") color = "text-danger";

    const textoLog = `[${tiempo}] > ${mensaje.toUpperCase()}`;
    
    // Guardar en la lista (Sin límites para que el Excel tenga TODO lo del día)
    let logsGuardados = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    logsGuardados.push({ texto: textoLog, clase: color });
    localStorage.setItem("logs_sistema", JSON.stringify(logsGuardados));

    // Mostrar en la terminal visual
    const nuevoLog = document.createElement("div");
    nuevoLog.className = `mb-1 ${color}`;
    nuevoLog.innerHTML = textoLog;
    contenedor.appendChild(nuevoLog);
    
    // Auto-scroll al último evento
    contenedor.scrollTop = contenedor.scrollHeight;

    // Contador muestra el total de eventos del día
    contador.innerText = `${logsGuardados.length} EVENTOS`;
}

function descargarReporte() {
    const logs = JSON.parse(localStorage.getItem("logs_sistema")) || [];
    
    if (logs.length === 0) {
        alert("No hay datos de auditoría para exportar.");
        return;
    }

    // 1. Crear el contenido CSV con BOM para que Excel detecte los acentos correctamente
    let csvContent = "FECHA Y HORA,DESCRIPCION DEL EVENTO\n";
    logs.forEach(log => {
        let fila = log.texto.replace("[", "").replace("]", "").replace(" > ", ",");
        csvContent += fila + "\n";
    });

    // 2. Usar un Blob (Binary Large Object) para mayor compatibilidad
    // Incluimos el carácter \uFEFF para que Excel reconozca la codificación UTF-8 automáticamente
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 3. Crear un link temporal seguro
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Bitacora_Seguridad_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        registrarLog("Reporte exportado exitosamente (Protocolo Seguro)", "success");
    }
}