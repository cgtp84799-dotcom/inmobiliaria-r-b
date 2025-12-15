Inmobiliaria Rincón Bedoya (INM R‑B)
Aplicación web para la gestión integral de inmuebles de Inmobiliaria Rincón Bedoya (Inmobiliaria R‑B), desarrollada con React + Vite, Firebase y Tailwind CSS. Permite administrar propiedades urbanas y rurales, arriendos, procesos legales asociados, comunicación con clientes, videoconferencias, calendarios y generación de reportes.

🚀 Demo en producción
Sitio en línea: https://inmobiliaria-ryb-y-asociados.web.app

🧱 Tecnologías y librerías principales
Core
React 19 + Vite 7 - Framework y tooling moderno para desarrollo rápido.

React Router DOM 7 - Navegación y rutas de la SPA.

Tailwind CSS 3 - Sistema de diseño y estilos utility-first.

Firebase Stack
Firebase 12 - Plataforma backend completa (Auth, Firestore, Realtime Database, Storage, Functions, Messaging).

Firebase Hosting - CDN y despliegue global.

Firebase Authentication - Gestión de usuarios y login seguro.

Cloud Firestore - Base de datos NoSQL para datos estructurados.

Realtime Database - Sincronización en tiempo real.

Cloud Storage - Almacenamiento de archivos e imágenes.

Cloud Functions - Lógica serverless y automatizaciones.

Cloud Messaging - Notificaciones push.

UI y experiencia de usuario
Framer Motion 12 - Animaciones fluidas y transiciones.

React Icons 5 + Lucide React - Biblioteca de iconos.

React Hot Toast 2 - Notificaciones y toasts elegantes.

Emoji Picker React 4 - Selector de emojis integrado.

Swiper 12 - Carruseles y sliders táctiles.

Funcionalidades avanzadas
React Big Calendar 1 - Calendario interactivo para eventos y citas.

Recharts 3 - Gráficos y visualización de datos.

jsPDF 3 + jsPDF AutoTable 5 - Generación de PDFs y reportes.

Leaflet 1.9 + React Leaflet 5 - Mapas interactivos para ubicación de inmuebles.

Jitsi React SDK 1 - Videoconferencias integradas.

React H5 Audio Player 3 - Reproductor de audio.

date-fns 4 + moment 2 - Manipulación y formato de fechas.

✨ Funcionalidades clave
Gestión completa de inmuebles: urbanos, rurales, arriendos, ventas, aparcerías, turismo.

Información jurídica detallada: saneamientos, procesos de pertenencia, sucesiones, remates, créditos hipotecarios, propiedad horizontal, avalúos.

Panel administrativo con visualización de propiedades, estados y acciones disponibles.

Calendario integrado para citas, visitas y eventos relacionados con inmuebles.

Mapas interactivos para ubicar propiedades geográficamente.

Generación de reportes PDF con información de inmuebles y transacciones.

Videoconferencias integradas para reuniones remotas con clientes.

Gráficos y estadísticas de propiedades, transacciones y rendimiento.

Sistema de notificaciones push y en tiempo real.

Reproductor de audio para notas de voz o grabaciones.

Diseño responsivo optimizado para escritorio, tablet y móvil.

🔥 Servicios de Firebase utilizados
Configurados en src/core/config/firebase.config.js:

Authentication (getAuth) - Gestión de usuarios y autenticación segura.

Cloud Firestore (getFirestore) - Base de datos principal NoSQL.

Realtime Database (getDatabase) - Sincronización en tiempo real de datos críticos.

Cloud Storage (getStorage) - Almacenamiento de imágenes de propiedades y documentos.

Cloud Functions (getFunctions) - Lógica de backend y procesos automáticos.

Cloud Messaging (getMessaging + isSupported) - Notificaciones push cross-browser.

🛠️ Requisitos
Node.js (versión LTS recomendada, 18 o superior).

npm (incluido con Node.js).

Cuenta de Firebase con proyecto configurado.

Git para clonar el repositorio.

⚙️ Instalación y uso en local
bash
# Clonar el repositorio
git clone https://github.com/cgtp84799-dotcom/inmobiliaria-r-b.git
cd inmobiliaria-r-b

# Instalar todas las dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
La aplicación se abrirá en http://localhost:5173 (Vite muestra el puerto en consola).

🚢 Despliegue en Firebase Hosting
bash
# Generar build de producción optimizado
npm run build

# Desplegar a Firebase Hosting
firebase deploy --only hosting
El directorio de salida es dist/ y la configuración está en firebase.json.

📂 Estructura del proyecto
text
.
├── functions/           # Cloud Functions (backend serverless)
├── public/              # Recursos estáticos (favicon, assets, verificación)
├── src/
│   ├── core/            # Configuración Firebase y lógica central
│   ├── components/      # Componentes React reutilizables
│   ├── pages/           # Vistas/páginas principales
│   └── main.jsx         # Punto de entrada de React
├── firebase.json        # Configuración Firebase Hosting/Functions
├── firestore.rules      # Reglas de seguridad Firestore
├── storage.rules        # Reglas de seguridad Storage
├── .firebaserc          # Proyecto Firebase asociado
├── package.json         # Dependencias y scripts
├── tailwind.config.js   # Configuración Tailwind CSS
├── vite.config.js       # Configuración Vite
├── index.html           # HTML base
└── README.md            # Este archivo
📈 SEO e indexación
Verificado en Google Search Console.

Archivos sitemap.xml y robots.txt se pueden añadir en public/.

Despliegue en Firebase Hosting con CDN global y SSL automático.

🔐 Seguridad
Reglas de seguridad configuradas en firestore.rules y storage.rules.

Autenticación Firebase para control de acceso.

Variables sensibles manejadas mediante configuración Firebase (no expuestas en código público).

👤 Autor
Mateo Carvajal Tamayo - Desarrollador web full-stack.

Este software fue desarrollado como proyecto de desarrollo web para Inmobiliaria Rincón Bedoya (INM R‑B), enfocado en la gestión inmobiliaria integral y soporte a procesos legales asociados.

📄 Derechos de autor y licencia
© 2025 Mateo Carvajal Tamayo. Todos los derechos reservados.

Este software fue desarrollado exclusivamente para Inmobiliaria Rincón Bedoya (INM R‑B). El autor retiene la propiedad intelectual completa del código fuente, arquitectura y estructura de la aplicación, concediendo a Inmobiliaria Rincón Bedoya el derecho de uso perpetuo de la plataforma para sus operaciones inmobiliarias.

Restricciones: Queda prohibida la copia, distribución, modificación, sublicenciamiento o uso comercial de este software por terceros sin consentimiento expreso y por escrito del autor.