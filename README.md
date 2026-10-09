# Planes Sarenti (herramienta privada de la doctora)

Herramienta web para crear planes de alimentación por paciente y generar el **código QR** (y el código de texto para WhatsApp) que el paciente carga en la app **Mi Plan Sarenti**.

- Funciona en computadora y en celular (es una PWA: se puede instalar desde el navegador).
- Protegida con PIN. No usa servidores ni cuentas: **todos los planes se guardan solo en el navegador del dispositivo** (`localStorage`).
- Se guarda sola mientras se escribe.
- Respaldo: botón "Respaldo" para descargar y cargar un archivo con todos los planes (sirve para cambiar de dispositivo).
- Escanear: en "Nuevo plan" se puede escanear el QR de un plan (cámara o foto) o pegar su código para seguir editándolo. Si el plan ya está en el dispositivo, pregunta si reemplazarlo.
- Llenar con IA: la pestaña "Llenar con IA" del plan arma las instrucciones con edad, peso, condición, alergias y objetivo (sin el nombre del paciente) para pegarlas en ChatGPT u otra IA. Al pegar su respuesta (JSON) se llenan los 7 días, que luego se pueden ajustar. Esos datos se guardan solo en el dispositivo y no van en el QR.
- Plantillas: "Guardar como plantilla" y "Nuevo plan" desde plantilla. Hay un "Plan de ejemplo" con datos inventados.

## Usar

Abrir `index.html` desde un servidor (no funciona el QR/instalación con doble clic por el service worker, pero la herramienta sí abre). Lo más fácil es publicarla con **GitHub Pages**:

1. En GitHub: Settings, Pages, Source "Deploy from a branch", rama `main`, carpeta `/ (root)`.
2. La dirección queda como `https://<usuario>.github.io/Mi-Plan-Sarenti-Program/`.
3. Abrirla en el celular/computadora y, en el menú del navegador, "Instalar" o "Agregar a pantalla de inicio".

Esta página **no contiene datos de pacientes** (están solo en cada dispositivo), así que el repositorio puede ser público. Aun así, no subas respaldos ni PDFs de pacientes al repositorio (el `.gitignore` ya los excluye).

## Seguridad: lo que hay que saber

- El PIN es un candado casual para que nadie abra la herramienta por error. Los datos **no están cifrados** en el dispositivo: usar también el bloqueo de pantalla del teléfono o la computadora.
- Si se olvida el PIN, la única forma de entrar es borrar los datos locales. Por eso conviene descargar respaldos de vez en cuando y guardarlos en un lugar seguro.
- Si se limpia el navegador o se pierde el dispositivo, los planes solo se recuperan con un respaldo.
- Los códigos QR contienen el plan completo (nombre incluido). Compartirlos solo con el paciente.

## Desarrollo

Sin dependencias de compilación. Librerías de QR incluidas en `vendor/` (qrcode-generator, MIT, para crear; jsQR, Apache-2.0, para escanear) y tipografías en `fonts/` (Cormorant Garamond y Jost, licencia OFL), para funcionar sin internet.

```
node tests/codec.test.js     # prueba del formato del código y capacidad del QR
python3 -m http.server 8000  # probar en local
```

Con internet, la página siempre carga la versión más reciente; la copia guardada (service worker) solo se usa sin conexión. Si se agrega un archivo nuevo, sumarlo a `FILES` en `sw.js` y subir el número de `CACHE`.

El formato del código está documentado en [FORMATO-DEL-CODIGO.md](FORMATO-DEL-CODIGO.md).
