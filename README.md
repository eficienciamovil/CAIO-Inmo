# INMO-IA | Simulador de Inversión, Rentabilidad y Transformación Organizacional

Aplicación web para defender el proyecto INMO-IA (trabajo final CAIO) ante un directorio o un CFO. Se modifican en vivo empleados, sucursales, llamadas, tarifas, adopción y margen, y el modelo recalcula al instante:

1. **Cuánto cuesta**: inversión por etapas, costos fijos, semifijos y variables.
2. **Cuánto valor genera**: ahorro evitable, capacidad liberada, contribución incremental, beneficio neto, ROI, payback, VAN y TIR.
3. **Qué transformación produce**: adopción cultural, capacitación, experiencia del cliente, evaluación psicosocial y puertas de decisión.

No necesita backend ni credenciales. Todo corre en el navegador y los escenarios se guardan en `localStorage`.

## Requisitos

- Node.js 18 o superior (probado con Node 24.14 y npm 11.13).

## Ejecución desde VS Code

1. Abrí la carpeta del proyecto en VS Code.
2. Abrí una terminal con **Terminal → Nueva terminal** (o `` Ctrl+` ``).
3. La primera vez, instalá las dependencias:
   ```bash
   npm install
   ```
4. Iniciá el simulador:
   ```bash
   npm run dev
   ```
5. Abrí la URL que aparece en la terminal, normalmente <http://localhost:5173>. Para abrirla, hacé Ctrl+clic sobre el enlace.

También podés usar **Terminal → Ejecutar tarea… → Iniciar simulador**, ya configurado en `.vscode/tasks.json`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta los tests del motor financiero (Vitest). |
| `npm run build` | Verifica los tipos y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve la versión de producción en <http://localhost:4173>. |

## Uso durante la presentación

- **Dashboard**: el panel "Simulación en vivo" tiene los sliders principales (empleados, sucursales, llamadas, % IA, tarifa Retell, adopción y margen). Las tarjetas siguen el orden *cuánto cuesta → cuánto valor genera → qué transformación produce*.
- **Clic en un indicador**: abre un panel con la fórmula y los valores de entrada ("¿De dónde sale este número?").
- **Selector "Escenario"** (arriba a la derecha): cambia entre Conservador, Base y Optimista. Cada escenario guarda sus propios parámetros.
- **Gobernanza**: los botones "Piloto exitoso / con desvíos / con incidente grave" cargan mediciones de demostración y muestran en vivo la decisión Escalar, Corregir o Suspender.
- **Rentabilidad**: el selector "Cifras de la presentación" muestra los USD 30.000 de la diapositiva 9 y su neto real después del OpEx.
- **Exportar**:
  - **CSV** descarga los resultados del escenario activo, listos para Excel (separador `;` y coma decimal).
  - **PDF** abre el diálogo de impresión; elegí "Guardar como PDF".
  - **Exportar/Importar** guarda o carga un escenario en JSON.
- **Restablecer** devuelve el escenario activo a sus valores iniciales.

Recomendación: antes de la exposición, presentá con el escenario Base y verificá que no queden ediciones de prueba. Si hace falta, usá **Restablecer**.

## Estructura

```
src/
  engine/        Motor financiero puro (sin React), con tests
    types.ts         Tipos del modelo
    money.ts         Periodicidades, división segura, formato USD
    capex.ts         Bloque I · CapEx por etapas
    fixedCosts.ts    Bloque II · fijos y semifijos
    training.ts      Capacitación inicial y recurrente
    voice.ts         Bloque III · Retell + ElevenLabs (sin doble conteo)
    whatsapp.ts      Bloque III · WhatsApp por mensaje y categoría
    value.ts         Valor económico (sin IA vs con IA)
    finance.ts       ROI, payback, VAN, TIR, equilibrio
    culture.ts       Índices de adopción y CX
    governance.ts    Puertas de decisión y riesgos
    simulate.ts      Orquestador: serie mensual, consolidador, explicaciones
    sensitivity.ts   Análisis de sensibilidad
    alternatives.ts  Actual / IA parcial / IA completa
    alerts.ts        Alertas del dashboard
    engine.test.ts   Tests
  data/
    defaults.ts      PARÁMETROS INICIALES EDITABLES (escenario Base)
    scenarios.ts     Conservador / Base / Optimista
    referencia.ts    Cifras de la presentación (hipótesis originales)
  state/store.tsx    Estado global y persistencia en localStorage
  components/        UI y gráficos
  modules/           Una pestaña por módulo
  export/export.ts   CSV, JSON y PDF
docs/
  MODELO_FINANCIERO.md
  SUPUESTOS.md
```

## Cambiar los valores iniciales

Editá `src/data/defaults.ts`. Cada valor tiene un estado (`confirmado`, `presentacion`, `historico`, `supuesto`, `demo`) que la interfaz muestra como etiqueta. Si ya abriste la app, presioná **Restablecer** para que tome los nuevos valores, porque los escenarios guardados en el navegador tienen prioridad.

## Documentación

- [docs/MODELO_FINANCIERO.md](docs/MODELO_FINANCIERO.md): fórmulas y criterios del modelo.
- [docs/SUPUESTOS.md](docs/SUPUESTOS.md): supuestos no confirmados y discrepancias de la presentación.
