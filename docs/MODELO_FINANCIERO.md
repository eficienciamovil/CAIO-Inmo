# Modelo financiero de INMO-IA

El motor (`src/engine`) es **determinista**: con los mismos parámetros siempre devuelve el mismo resultado y no usa números aleatorios. Primero calcula una serie mensual de 36 meses y después deriva de ella todos los indicadores. El horizonte de evaluación (12, 24 o 36 meses) define cuántos meses entran en el ROI, el VAN y la TIR.

## 1. Costos

### Bloque I · CapEx por etapas

- **Costo de actividad** = Horas × Tarifa horaria + Costos externos.
- Cada partida tiene un mes de ejecución. Las partidas **únicas** son inversión. Las **recurrentes** se repiten cada mes desde su mes de inicio y se suman al OpEx.
- Las dependencias entre etapas se validan: el sistema avisa si una etapa empieza antes que otra de la que depende.
- **Tratamiento contable**: si la inversión se *activa*, se amortiza linealmente desde el mes siguiente al desembolso. Si se registra como *gasto*, impacta en el mes del desembolso. Esta elección no modifica el flujo de caja.

### Bloque II · Fijos y semifijos

- **Subtotal** = cantidad efectiva × precio unitario. La cantidad efectiva es la cantidad cargada, multiplicada por los empleados o las sucursales cuando la línea usa ese multiplicador.
- **Mensual** = subtotal / meses de la periodicidad (mensual = 1, trimestral = 3, semestral = 6, anual = 12). Las líneas con periodicidad "único" son desembolsos en su mes de inicio.
- El **abono de ElevenLabs** cuenta como costo fijo.

### Capacitación

- Participantes = ⌈empleados × % a capacitar⌉.
- Sesiones = ⌈participantes / capacidad⌉, siempre redondeando hacia arriba.
- Inicial = sesiones × horas × tarifa del instructor + participantes × (materiales + arancel). El costo de oportunidad se suma solo si se activa la opción.
- Recurrente (OpEx) = refuerzos + nuevas incorporaciones. Las incorporaciones se calculan con la rotación anual.
- **Sin doble conteo**: si la formación inicial ya está en el CapEx (es el caso por defecto, porque la diapositiva 9 la incluye), el bloque de capacitación no la suma. Si no está en el CapEx, las partidas de CapEx marcadas como "Formación" se excluyen y se usa el cálculo del bloque de capacitación.

### Bloque III · Variables

**Llamadas.** Son totales mensuales de la organización. Solo el modo "por sucursal" multiplica por la cantidad de sucursales; los empleados nunca multiplican llamadas. Los volúmenes se limitan a 1–5.000 entrantes y 1–1.000 salientes.

- Minutos IA entrantes = entrantes × duración media × % IA.
- Minutos IA salientes = salientes × duración media × % IA + reintentos.
- Reintentos = salientes IA × % fallidas × reintentos por fallida × minutos por intento.

**Retell y ElevenLabs (sin doble facturación)**

| Modo | Retell | ElevenLabs |
|---|---|---|
| Integrado | todos los minutos × tarifa completa | solo el abono, si se mantiene activo (p. ej. para clonación de voces) |
| Independiente | minutos × (tarifa − componente de voz) | abono + max(0, minutos − incluidos) × excedente |
| Mixto | reparte el consumo según el % configurado | ídem, sobre la parte de minutos asignada |

Los minutos incluidos de ElevenLabs se aplican solo a los minutos cuya voz factura ElevenLabs. Nunca se descuentan del consumo de Retell.

**WhatsApp**

- Costo = Σ por categoría (mensajes facturables × tarifa del país y la categoría).
- Los mensajes de servicio, que se responden dentro de la ventana de atención, no se facturan.
- Las plantillas de utilidad enviadas dentro de una ventana abierta no se facturan (el % es configurable).
- No se usa una tarifa única por conversación.
- Una tarifa **sin fecha de vigencia o sin categoría no se aplica** y genera una alerta.
- Con el canal no oficial (Evolution/Baileys) no hay cargos de Meta, pero se agrega la alerta de riesgo correspondiente.

**Otros variables**: LLM (USD por cada 1.000 interacciones IA), transcripción por minuto y almacenamiento.

**Rampa**: cada canal arranca en su mes configurado y alcanza el volumen pleno en *n* meses. Esto afecta la serie de caja. En los escenarios por defecto todo arranca en el mes 1, así que la caja del año 1 coincide con el presupuesto (25.000 + 22.000).

## 2. Consolidador

- OpEx mensual (régimen) = Fijos + Semifijos + Variables.
- **Costo año 1 = inversión inicial + OpEx anual** (criterio presupuestario). La serie mensual (caja) se usa para la recuperación, el ROI, el VAN y la TIR.
- TCO = Σ de los meses del horizonte.
- Indicadores unitarios: costo por sucursal y por empleado (año 1), por llamada atendida por IA, por lead útil y por visita (OpEx mensual / volumen mensual con IA).
- Todos los cocientes usan división segura: si el divisor es 0 se muestra "n/d", nunca infinito.

## 3. Valor económico

**Modo por defecto: crecimiento de ventas (informe AMBA)**

- Contribución por venta = precio × comisión × (1 − costos variables); con los valores del informe, 120.000 × 5% × 75% = 4.500. Después del impuesto supuesto del 35%: 2.925.
- Ventas adicionales/año = ventas por sucursal/mes × sucursales × 12 × % de crecimiento.
- Beneficio bruto = ventas adicionales × contribución.
- Ventas para recuperar el año 1 = ⌈costo año 1 / contribución⌉, antes y después de impuestos (11 y 17 con 47.000).

**Modo embudo** (alternativo)

**Consultas** = llamadas entrantes + conversaciones entrantes de WhatsApp.

**Escenario actual sin IA**

- Consultas perdidas = consultas × % fuera de horario × % que hoy se pierde.
- El embudo es: consultas atendidas → leads útiles → visitas → operaciones.

**Con INMO-IA**

- Cobertura IA = consultas automatizadas / consultas.
- Recuperadas = perdidas × cobertura IA × % de recuperación.
- Operaciones adicionales = (visitas de leads recuperados + mejora % sobre las visitas base) × conversión.
- **Contribución incremental** = operaciones adicionales × contribución marginal por operación. Se usa margen, no facturación.
- **Horas liberadas** = consultas automatizadas *en horario* × (1 − % derivación) × minutos humanos / 60.

**Clasificación de las horas liberadas (sin doble conteo)**

| Situación | Tratamiento |
|---|---|
| Plantilla constante | Las horas son **capacidad recuperada**, no ahorro de nómina. Se monetizan solo con la opción "hipótesis verificable" × % de aprovechamiento, o no se monetizan. Si ya explican las ventas adicionales, cuentan 0 para no duplicar. |
| Reducción de estructura | Las horas se valoran como **costo evitable**. |

**Factor de adopción**: factor = (1 − d) + d × adopción efectiva. La dependencia *d* es una hipótesis explícita y editable. La adopción efectiva es el "uso activo" medido; si no hay medición, se usa el objetivo proyectado.

**Resultados**

- Beneficio bruto = (ahorro evitable + capacidad monetizada + contribución) × factor de adopción.
- Beneficio neto = beneficio bruto − OpEx.
- **Modo presentación**: usa los USD 18.000 + 12.000 de la diapositiva 9 como beneficio bruto declarado. El neto descuenta el OpEx.

## 4. Indicadores financieros

- **ROI** = (beneficios acumulados − costos acumulados) / costos acumulados × 100, sobre el horizonte.
- **Payback**: primer mes en que el flujo acumulado vuelve a ser ≥ 0.
- **VAN** = Σ flujo_m / (1 + r_m)^m, con r_m = (1 + tasa anual)^(1/12) − 1.
- **TIR**: tasa mensual que anula el VAN, calculada por bisección y anualizada. Si los flujos no cambian de signo, se muestra "n/d".
- **Equilibrio**:
  - Operaciones/mes para cubrir el OpEx = OpEx mensual / margen.
  - Operaciones para cubrir la inversión = (costo total del horizonte − ahorro y capacidad del horizonte) / margen.
  - Alternativa sin ventas: ahorro verificable/mes = costo total / meses.

## 5. Adopción, CX y gobernanza

- **Índice cultural** = Σ (peso × puntaje) / Σ pesos. Los indicadores "menor es mejor" se invierten (100 − v). Si falta alguna medición, el índice medido queda vacío: no se completa con estimaciones.
- **CX**: valor actual, objetivo y medido; la mejora se expresa en la dirección deseada.
- **Puertas de decisión**:
  - criterio crítico incumplido → Suspender;
  - otro criterio incumplido → Corregir;
  - faltan mediciones → Continuar piloto;
  - todos los criterios se cumplen → Escalar.
- **Riesgo residual**: probabilidad × impacto, reducido según la evidencia del control. Un control solo diseñado multiplica por 0,85; con evidencia parcial, por 0,7; con evidencia verificada, por 0,4.

## 6. Sensibilidad y alternativas

- **Sensibilidad (tornado)**: mueve ±X% cada variable por separado y recalcula el ROI, el VAN o el neto del año 1. Las variables son llamadas, duración, costo por minuto, automatización, adopción, conversión, margen y capacitación.
- **Alternativas**:
  - *sistema actual*: costo y beneficio incremental 0;
  - *IA parcial*: solo WhatsApp + CRM, sin voz ni partidas de voz en el CapEx;
  - *IA completa*: el escenario tal como está configurado.

## 7. Tests

`npm test` ejecuta `src/engine/engine.test.ts`, con 51 casos. Cubren:

- el caso de control: 3.400 min × 0,159 = USD 540,60/mes y USD 6.487,20/año; capacitación 50 × 50 = USD 2.500;
- doble facturación de Retell y ElevenLabs;
- doble conteo de la capacitación;
- duplicación de llamadas por sucursal;
- tarifas de WhatsApp sin fecha o sin categoría;
- confusión entre ahorro y capacidad liberada;
- división por cero;
- ROI y costo del año 1;
- resultados negativos mostrados como pérdida;
- valores fuera de rango;
- determinismo;
- puertas de decisión, escenarios y alternativas;
- exportación CSV.
