# 🛡️ Apex Security - IoT Access Control System
> **Infraestructura inteligente para la gestión, autorización y monitoreo de accesos críticos en tiempo real.**

![GitHub Repo Size](https://img.shields.io/github/repo-size/geovannilabra/puertas?style=for-the-badge)
![JS Version](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?style=for-the-badge&logo=bootstrap)
![Status](https://img.shields.io/badge/Status-Stable%20v2.4-success?style=for-the-badge)

---

## 📖 Descripción General
**Apex Security** es una solución robusta diseñada para el **el monitoreo de cerraduras**, orientada a la supervisión de áreas restringidas mediante una arquitectura multi-capa. El sistema permite la gestión dinámica de inventario IoT, el control remoto de cerraduras electrónicas y la generación de auditorías forenses inalterables.

## 🚀 Funcionalidades Principales
* **Administración de Nodos**: Registro dinámico de activos (Almacén, Laboratorio, Subestación) con asignación de **ID único** y ubicación física.
* **Centro de Autorización**: Interfaz operativa con **buscador inteligente** y tarjetas de estado para la apertura y cierre remoto de dispositivos.
* **Monitor de Autonomía**: Supervisión de niveles de batería (100%) y estatus de seguridad en tiempo real.
* **Terminal de Auditoría**: Consola de registros detallados que documenta altas, bajas y modificaciones con marcas de tiempo precisas para trazabilidad total.

## 🛠️ Stack Tecnológico
* **Frontend:** HTML5, CSS3 (Custom Grid), JavaScript Moderno.
* **Framework:** Bootstrap 5.3 + Bootstrap Icons.
* **Persistencia:** MockAPI (RESTful Services) para la simulación de datos IoT.

## 📂 Arquitectura del Proyecto
La estructura sigue estándares de la industria para separar la lógica de negocio de la presentación:

```text
/
├── assets/imagen/  # Recursos visuales (Favicons y Logos)
├── css/            # Estilos CSS (styles.css)
├── js/             # Lógica del Sistema (script.js)
└── index.html      # Punto de entrada de la aplicación