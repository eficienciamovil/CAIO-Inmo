# Supuestos no confirmados y discrepancias

La pestaña **Supuestos** de la aplicación calcula en vivo cuánto del costo del año 1 se apoya en datos no confirmados. Este documento resume lo que hay que validar antes de presentar las cifras como definitivas.

## Cifras de la presentación (hipótesis originales, no resultados)

| Concepto | Valor | Fuente | Observación |
|---|---|---|---|
| Presupuesto original de referencia | USD 30.000 | Diap. 9 | Considerado insuficiente para voz y plan cultural |
| CapEx revisado | USD 25.000 | Diap. 9 | Setup, integración y capacitación |
| OpEx revisado | USD 22.000 | Diap. 9 | Licencias y telefonía IA, 12 meses |
| Inversión total año 1 | USD 47.000 | Diap. 9 | Condicionada a gates |
| Ahorro en horas operativas | USD 18.000/año | Diap. 9 | Sin plantilla reducida es **capacidad**, no ahorro |
| Leads perdidos fuera de horario | USD 12.000/año | Diap. 9 | Requiere conversión × margen comprobables |
| "Ahorro Neto Directo" | USD 30.000/año | Diap. 9 | Es **beneficio bruto**: el neto es 30.000 − 22.000 = 8.000 |
| "Cubre el 63% de la inversión" | 30/47 | Diap. 9 | Compara beneficio bruto contra costo total |
| Gates G1 + G2 + G3 | 6.000 + 12.000 + 12.000 | Diap. 10 | Suman 30.000, no 47.000 |

## Discrepancias a resolver antes de la exposición

1. **47.000 vs 30.000.** La diapositiva 9 pide USD 47.000 para el año 1, pero la votación de la diapositiva 10 libera USD 30.000. Quedan USD 17.000 sin financiamiento asignado. Conviene distinguir tres conceptos:
   - el presupuesto total;
   - los fondos solicitados inicialmente (G1: 6.000);
   - los desembolsos sujetos a aprobación (G2 y G3).
2. **"Ahorro Neto Directo".** Los USD 30.000 son beneficio bruto. Con las cifras de la propia presentación, el neto anual es 8.000 y el CapEx de 25.000 se recupera en algo más de 3 años.
3. **USD 18.000 de horas operativas.** Si la inmobiliaria mantiene la plantilla, no son ahorro de caja. Para monetizarlos hace falta demostrar en qué se usan las horas liberadas.
4. **USD 12.000 de oportunidades.** Para que sean contribución económica hay que demostrar la tasa de conversión y el margen por operación, contra una línea base de 4 semanas y una cohorte o sucursal de control.

## Tarifas aportadas por el usuario

| Concepto | Valor | Estado | Pendiente |
|---|---|---|---|
| Retell AI | USD 0,159/min | Confirmado (captura) | Confirmar qué componentes incluye: LLM, voz, telefonía |
| Google One | USD 10/mes | Confirmado | — |
| ElevenLabs Starter | USD 6/mes, 75 min | Confirmado | El excedente por minuto es un supuesto |
| Evolution API | USD 83 | Supuesto | **Periodicidad no confirmada** (mensual, anual o única) |
| WhatsApp (AR, ES, CO, MX, PE) | Tabla 2025 | Histórico | Modelo de cobro cambiado. Reemplazar por la tabla vigente o por los valores exactos de la captura |

> Los precios de WhatsApp cargados en `src/data/defaults.ts` son una referencia aproximada de 2025, no la transcripción de la captura del usuario. Antes de la defensa hay que reemplazarlos por los valores exactos y vigentes.

## Supuestos de demostración (reemplazar por cotizaciones o línea base)

- **Desglose del CapEx por actividad** (horas y tarifa de USD 30/h). Está calibrado para sumar los USD 25.000 de la presentación.
- **Planes ElevenLabs** Free, Creator y Pro, y el **componente de voz** dentro de la tarifa Retell (USD 0,07/min).
- **Hosting/VPS** USD 30/mes, **CRM** USD 10/usuario/mes, **mantenimiento técnico** USD 400/mes, **auditoría de IA** USD 1.500/año, **backups**, **dominios** y **cartelería QR**.
- **LLM** USD 5 por cada 1.000 interacciones y **almacenamiento** USD 5/mes.
- **Capacitación paramétrica**: 8 h por empleado, instructor USD 40/h, 15 alumnos por sesión, 2 refuerzos al año y rotación del 20%.
- **Operación comercial**:
  - 35% de consultas fuera de horario, de las que hoy se pierde el 60%;
  - 70% de recuperación con IA;
  - embudo: 30% lead útil, 35% visita y 6% conversión;
  - **contribución de USD 2.000 por operación**;
  - 6 minutos humanos por consulta y USD 12/h de costo laboral.
- **Capacidad monetizada**: 40% de las horas liberadas. Requiere una hipótesis verificable.
- **Dependencia del beneficio respecto de la adopción**: 40%.
- **Adopción objetivo**: 75% de uso activo. Indicadores culturales, de CX y psicosociales de base: valores ilustrativos hasta aplicar la encuesta inicial.
- **Arranques y rampas**: WhatsApp en el mes 2, voz en el mes 4, beneficios desde el mes 3 con 6 meses de rampa.

## Lectura del escenario Base con estos supuestos

Valores verificados con `npm test` y en la interfaz:

| Indicador | Valor |
|---|---|
| Inversión inicial | USD 25.200 (25.000 de CapEx + 200 de cartelería QR) |
| OpEx en régimen | ≈ USD 1.785/mes (≈ 21.400/año), cercano a los 22.000 de la presentación |
| Costo del año 1 | ≈ USD 41.500, por la rampa de arranque |
| Beneficio bruto | ≈ USD 30.600/año, cercano a los 30.000 de la presentación |
| ROI a 36 meses | −4,6% |
| Payback | no se recupera dentro de los 36 meses |

**Conclusión para el CFO:** con beneficios de ~30.000 brutos y OpEx de ~22.000, el proyecto queda en el umbral de rentabilidad. La decisión depende sobre todo de la **conversión comercial**, el **margen por operación** y la **tasa de automatización**, que son las variables de mayor impacto en el tornado de sensibilidad. Esto refuerza el modelo de gates *kill-fast*: liberar fondos solo cuando el piloto demuestre esos valores.

## Versiones futuras (fuera de alcance)

- Control y reclamo automático de pagos de alquileres, rentas y comisiones.
- Tasaciones asistidas por IA.
- Armado de contratos.
