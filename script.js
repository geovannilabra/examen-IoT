const API_URL = "https://698a177cc04d974bc6a15386.mockapi.io/api/v1/puertas";

document.addEventListener("DOMContentLoaded", () => {
    actualizarDatos();
    // Punto 5c: Tasa de refresco de 2 segundos
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

// PUNTO 3: CRUD
function renderAdmin(puertas) {
    const tabla = document.getElementById("tablaAdmin");
    if(!tabla) return;
    tabla.innerHTML = "";
    puertas.forEach(p => {
        tabla.innerHTML += `<tr>
            <td>${p.nombre}</td><td>${p.ubicacion}</td>
            <td><button class="btn btn-outline-danger btn-sm" onclick="eliminarPuerta('${p.id}')">Eliminar</button></td>
        </tr>`;
    });
}

async function crearPuerta() {
    const n = document.getElementById("nombreP").value;
    const u = document.getElementById("ubicacionP").value;
    if(!n || !u) return;
    await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            nombre: n, ubicacion: u, estado: false, bateria: 100, 
            fecha_act: new Date().toLocaleDateString() 
        })
    });
    document.getElementById("nombreP").value = "";
    document.getElementById("ubicacionP").value = "";
    actualizarDatos();
}

async function eliminarPuerta(id) {
if(!confirm("¿Deseas eliminar este dispositivo y borrar todo su historial?")) return;
    
    // 1. Borramos los datos del navegador vinculados a este ID
    localStorage.removeItem(`contador_abrir_${id}`);
    localStorage.removeItem(`contador_cerrar_${id}`);
    localStorage.removeItem(`lista_A_${id}`);
    localStorage.removeItem(`lista_C_${id}`);

    // 2. Borramos de la API
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        actualizarDatos();
    } catch (e) { console.error("Error al eliminar:", e); }
}

// PUNTO 4: Control
function renderControl(puertas) {
    const contenedor = document.getElementById("contenedorControl");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    puertas.forEach(p => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="card text-center shadow-sm">
                    <div class="card-body">
                        <h6>${p.nombre}</h6>
                        <div class="form-check form-switch d-inline-block">
                            <input class="form-check-input" type="checkbox" role="switch" style="transform: scale(1.5);" 
                            ${p.estado ? 'checked' : ''} onclick="togglePuerta('${p.id}', ${p.estado})">
                        </div>
                        <p class="mt-2 ${p.estado ? 'text-success' : 'text-danger'} fw-bold">${p.estado ? 'ABIERTA' : 'CERRADA'}</p>
                    </div>
                </div>
            </div>`;
    });
}

// PUNTO 7: Regla Lógica y Almacenamiento de Historial Real
async function togglePuerta(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString();

    let datos = { estado: nuevoEstado, fecha_act: ahora.toLocaleDateString() };

    if (nuevoEstado) {
        datos.hora_apertura = horaActual;
        // Guardar en lista de aperturas
        let hA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
        hA.unshift(horaActual);
        localStorage.setItem(`lista_A_${id}`, JSON.stringify(hA.slice(0, 10)));
        
        let actualA = parseInt(localStorage.getItem(`contador_abrir_${id}`)) || 0;
        localStorage.setItem(`contador_abrir_${id}`, actualA + 1);
    } else {
        datos.hora_cierre = horaActual;
        // --- NUEVO: Guardar en lista de cierres ---
        let hC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        hC.unshift(horaActual);
        localStorage.setItem(`lista_C_${id}`, JSON.stringify(hC.slice(0, 10)));

        let actualC = parseInt(localStorage.getItem(`contador_cerrar_${id}`)) || 0;
        localStorage.setItem(`contador_cerrar_${id}`, actualC + 1);
    }

    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
        });
        actualizarDatos();
    } catch (e) { console.error("Error:", e); }
}

// PUNTO 5: Monitoreo
function renderMonitoreo(puertas) {
    const grafico = document.getElementById("contenedorGrafico");
    const tabla = document.getElementById("tablaMonitoreo");
    if(!tabla || !grafico) return;
    
    grafico.innerHTML = "";
    tabla.innerHTML = "";

    puertas.forEach(p => {
        grafico.innerHTML += `
            <div class="col-md-4 mb-2">
                <small>${p.nombre} (Batería)</small>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${p.bateria < 20 ? 'bg-danger' : 'bg-success'}" 
                    style="width: ${p.bateria}%">${p.bateria}%</div>
                </div>
            </div>`;
    });

    const ultimos = [...puertas].sort((a, b) => new Date(b.fecha_act) - new Date(a.fecha_act)).slice(0, 10);

    ultimos.forEach(p => {
        tabla.innerHTML += `
            <tr>
                <td class="text-primary fw-bold" style="cursor:pointer; text-decoration:underline;" onclick="verDetalles('${p.id}')">
                    ${p.nombre}
                </td>
                <td><span class="badge ${p.estado ? 'bg-success' : 'bg-danger'}">${p.estado ? 'Abierta' : 'Cerrada'}</span></td>
                <td>${p.bateria}%</td>
                <td>${p.fecha_act || "---"}</td>
                <td class="text-primary fw-bold">${p.hora_apertura || "---"}</td>
                <td class="text-secondary fw-bold">${p.hora_cierre || "---"}</td>
            </tr>`;
    });
}

// PUNTO 8: Originalidad - Historial Dinámico
async function verDetalles(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const p = await res.json();
        
        document.getElementById("tituloModal").innerText = `Historial: ${p.nombre}`;
        const tablaDetalle = document.getElementById("cuerpoTablaDetalle");
        tablaDetalle.innerHTML = "";

        let listaA = JSON.parse(localStorage.getItem(`lista_A_${id}`)) || [];
        let listaC = JSON.parse(localStorage.getItem(`lista_C_${id}`)) || [];
        
        for(let i = 0; i < 10; i++) {
            tablaDetalle.innerHTML += `
                <tr>
                    <td>${p.fecha_act}</td>
                    <td class="text-primary fw-bold">${listaA[i] || "---"}</td>
                    <td class="text-danger fw-bold">${listaC[i] || "---"}</td>
                </tr>`;
        }
        
        document.getElementById("contadorAperturas").innerText = localStorage.getItem(`contador_abrir_${id}`) || 0;
        document.getElementById("contadorCierres").innerText = localStorage.getItem(`contador_cerrar_${id}`) || 0;

        new bootstrap.Modal(document.getElementById('modalDetalle')).show();
    } catch (e) { console.error("Error:", e); }
}