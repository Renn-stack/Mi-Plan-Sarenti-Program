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

Ejemplo (recortado):

```json
{"v":1,"i":"k3j9x0a1b","n":"Lucía Torres","u":1760000000,"g":8,
 "d":["Probiótico en ayunas"],"a":["Refrescos"],"p":["Hornear, no freír"],
 "w":[[["Desayuno","08:00",["2 huevos","1/3 de aguacate"]],["Comida","14:00",["Pollo","Ensalada"]]],
      [],[],[],[],[],[]]}
```

## Reglas para la app del paciente

- Tolerar claves faltantes en `d`, `a`, `p` (tratarlas como lista vacía) e ignorar claves desconocidas.
- `w` siempre tiene 7 días; un día puede tener 0 comidas.
- Un alimento que empieza con `"# "` (numeral y espacio) es el **nombre del platillo** (ej. `"# Chilaquiles"`): se muestra como título, sin casilla, y no cuenta en el avance del día. Las casillas siguen usando la posición del renglón dentro de la comida.
- El día 0 de `w` es el **Día 1**: la app empieza a contar el día en que la paciente carga el plan (si llega una versión nueva con el mismo `i`, sigue en el día donde iba).
- Límites razonables al leer: 12 comidas por día, 40 alimentos por comida, textos de hasta 300 caracteres.
- Al cargar un plan nuevo con el mismo `i`, conservar el progreso ya marcado de los días que no cambiaron es opcional; lo mínimo es reemplazar el plan.
- Un QR de plan completo mide unos 800 a 1500 caracteres, así que es de tamaño normal y se escanea bien.

La implementación de referencia está en `codec.js` y las pruebas en `tests/codec.test.js`.
