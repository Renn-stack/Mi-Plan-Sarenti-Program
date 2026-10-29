# Formato del código de plan (versión 1)

Es el contrato entre esta herramienta (doctora) y la app del paciente (Mi Plan Sarenti, Flutter).
El mismo texto va dentro del QR y se puede pegar desde WhatsApp.

```
SARENTI1.<base64url sin relleno>
```

El contenido es el JSON compacto (UTF-8) comprimido con **gzip**. Para leerlo:

1. Buscar `SARENTI1.` en el texto pegado (puede venir rodeado de otro texto o con saltos de línea) y tomar lo que sigue, quitando espacios y saltos de línea.
2. Decodificar base64url (`-` y `_`, sin `=`).
3. Descomprimir gzip y parsear el JSON.
4. Validar `v == 1`. Si es otra versión, mostrar "Actualiza la app".

## JSON compacto

| Clave | Tipo | Significado |
|---|---|---|
| `v` | número | Versión del formato (1) |
| `i` | texto | Id del plan. Si llega el mismo id, el plan nuevo reemplaza al anterior |
| `n` | texto | Nombre del paciente |
| `u` | número | Fecha de actualización, segundos Unix |
| `g` | número | Vasos de agua al día (de 250 ml) |
| `d` | lista de texto | "Cada día" |
| `a` | lista de texto | "Evitar" |
| `p` | lista de texto | "Preparación" |
| `w` | lista de 7 días | Lunes a domingo. Cada día es una lista de comidas `[nombre, "HH:MM", [alimentos]]` |
| `c` | objeto (opcional) | Lista de compras revisada con IA: qué se compra de cada renglón. Llave = el renglón exacto de `w`, valor = lista de ingredientes. Ej. `{"Limón y chile en polvo": ["Limón", "Chile en polvo"], "Agua natural": []}` |

Ejemplo (recortado):

```json
{"v":1,"i":"k3j9x0a1b","n":"Lucía Torres","u":1760000000,"g":8,
 "d":["Probiótico en ayunas"],"a":["Refrescos"],"p":["Hornear, no freír"],
 "w":[[["Desayuno","08:00",["2 huevos","1/3 de aguacate"]],["Comida","14:00",["Pollo","Ensalada"]]],
      [],[],[],[],[],[]]}
```

## Versión 2 (planes largos)

Si el código v1 no cabe en un QR (sobre todo con la lista de compras `c`), la herramienta usa la versión 2.
Los planes que sí caben siguen saliendo en v1, para que los lea cualquier versión de la app.

```
SARENTI2.<dígitos>
```

- En el QR va en dos partes: `SARENTI2.` en modo alfanumérico y los dígitos en modo numérico (cabe casi 30% más que base64).
- Los dígitos son los bytes de **deflate-raw** (sin encabezado gzip) en bloques de 7 bytes = 17 dígitos (número big-endian con ceros a la izquierda). El último bloque puede tener 1 a 6 bytes = 3, 5, 8, 10, 13 o 15 dígitos.
- Para leerlo: tomar los dígitos que siguen a `SARENTI2.` (quitando espacios y saltos de línea), pasarlos a bytes, descomprimir deflate-raw y parsear el JSON.
- El JSON es igual al de v1, con `"v":2` y `c` como lista `[[número, [ingredientes]], ...]`. El número es la posición del renglón dentro de los renglones de `w` sin repetir, en el orden en que aparecen (día por día, comida por comida, incluidos los `"# "`). Al leer se convierte a la `c` de v1.

## Reglas para la app del paciente

- Tolerar claves faltantes en `d`, `a`, `p` (tratarlas como lista vacía) e ignorar claves desconocidas.
- `w` siempre tiene 7 días; un día puede tener 0 comidas.
- Un alimento que empieza con `"# "` (numeral y espacio) es el **nombre del platillo** (ej. `"# Chilaquiles"`): se muestra como título, sin casilla, y no cuenta en el avance del día. Las casillas siguen usando la posición del renglón dentro de la comida.
- El día 0 de `w` es el **Día 1**: la app empieza a contar el día en que la paciente carga el plan (si llega una versión nueva con el mismo `i`, sigue en el día donde iba).
- `c` es opcional y se ignora si viene mal. En la lista de compras, un renglón que está en `c` se cambia por sus ingredientes (lista vacía = no se compra nada); los que no están se leen tal cual. Solo trae renglones que cambian algo. Límites: 400 renglones, 10 ingredientes por renglón, 120 caracteres.
- Límites razonables al leer: 12 comidas por día, 40 alimentos por comida, textos de hasta 300 caracteres.
- Al cargar un plan nuevo con el mismo `i`, conservar el progreso ya marcado de los días que no cambiaron es opcional; lo mínimo es reemplazar el plan.
- Un plan completo sin lista de compras mide unos 800 a 1500 caracteres (QR normal). Con la lista de compras puede necesitar v2 y un QR grande (unos 160 módulos), que se lee mejor desde la imagen ("Adjuntar corazón digital") o con Zoom.

La implementación de referencia está en `codec.js` y las pruebas en `tests/codec.test.js`.
