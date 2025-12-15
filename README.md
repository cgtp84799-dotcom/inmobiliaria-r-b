# Inmobiliaria Rincón Bedoya (INM R‑B)

Aplicación web para la gestión integral de inmuebles de Inmobiliaria Rincón Bedoya (Inmobiliaria R‑B), desarrollada con React + Vite, Firebase y Tailwind CSS. Permite administrar propiedades urbanas y rurales, arriendos, procesos legales asociados y comunicación con clientes. [web:100][web:129]

## 🚀 Demo en producción

- Sitio en línea: https://inmobiliaria-ryb-y-asociados.web.app [web:10]

## 🧱 Tecnologías principales

- **React + Vite** para la SPA y la experiencia de usuario. [web:8]
- **Firebase Hosting** para despliegue y CDN.
- **Firebase Authentication** para gestión de usuarios y login seguro. [web:128]
- **Cloud Firestore** para almacenamiento principal de datos estructurados. [web:122]
- **Realtime Database** para sincronización en tiempo real de información clave. [web:116]
- **Cloud Storage** para manejo de archivos (por ejemplo, imágenes de propiedades). [web:72]
- **Cloud Functions** para lógica de backend sin servidor y tareas automatizadas. [web:72]
- **Cloud Messaging** para notificaciones push en navegadores compatibles. [web:128]
- **Tailwind CSS** para estilos y diseño responsivo moderno. [web:129]

## ✨ Funcionalidades clave

- Gestión de inmuebles urbanos y rurales (arriendo, venta, aparcerías, turismo, etc.).
- Organización de información jurídica: saneamientos, procesos de pertenencia, sucesiones, remates, créditos hipotecarios, propiedad horizontal, avalúos y más. [file:31]
- Panel tipo inmobiliaria para visualizar propiedades, estados y acciones disponibles.
- Integración con Firebase (Auth, Firestore, Realtime Database, Storage, Functions, Messaging) para datos, archivos, automatización y notificaciones.
- Diseño responsivo listo para escritorio y dispositivos móviles.

## 🔥 Servicios de Firebase utilizados

Configurados en `src/core/config/firebase.config.js`:

- **Authentication (`getAuth`)**: gestión de usuarios y autenticación.
- **Cloud Firestore (`getFirestore`)**: base de datos principal para entidades de negocio.
- **Realtime Database (`getDatabase`)**: operaciones que requieren actualización en tiempo real.
- **Cloud Storage (`getStorage`)**: almacenamiento de imágenes y otros archivos.
- **Cloud Functions (`getFunctions`)**: lógica de backend y procesos automáticos.
- **Cloud Messaging (`getMessaging` + `isSupported`)**: notificaciones push cuando el navegador lo soporta. [web:116][web:128]

## 🛠️ Requisitos

- Node.js (versión LTS recomendada).
- npm.
- Cuenta de Firebase con un proyecto configurado.
- Git (para clonar y versionar el código). [web:75][web:15]

## ⚙️ Instalación y uso en local
