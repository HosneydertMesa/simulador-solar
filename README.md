# Solara — Simulador de instalaciones solares

Simulador web para dimensionar **paneles, inversores y baterías**, calcular la cadena energética con pérdidas reales (DC→AC, temperatura, suciedad, clipping, RTE de batería) y **comparar cotizaciones de varios proveedores**. Incluye una escena **3D interactiva** de la casa, el campo FV y el cuarto de equipos.

## Por qué Next.js + React Three Fiber

| Opción | Encaja | Por qué no (o sí) |
| --- | --- | --- |
| **Next.js + R3F + drei (elegida)** | Producto completo | Rutas, UI de catálogo, motor TypeScript testeable y WebGL declarativo en el mismo repo. El `Canvas` se carga solo en el cliente (`ssr: false`). |
| Vite + React + R3F | SPA más liviana | Igual de capaz en 3D, peor para crecer a auth, API PVGIS/NREL y páginas de informe. |
| Three.js “vanilla” | Control total | Mucho más código para la misma escena. |
| Unity / Unreal WebGL | Visual de marketing | Pesado, peor para iterar cálculos y precios. |

El cálculo **no vive dentro del 3D**: está en `src/engine/` (puro TypeScript, Vitest). La escena solo visualiza el sistema.

## Qué calcula hoy

- Irradiancia en el plano (POA) con fracción difusa Erbs, IAM ASHRAE y albedo.
- Temperatura de celda (NOCT) y coeficiente γ de potencia.
- Derates: suciedad, mismatch, LID, nameplate, cableado DC/AC, disponibilidad.
- Inversor con **curva η(carga)**, standby, límite DC y **clipping**.
- Stringing: Voc en frío vs Vdc máx, Vmp en calor vs ventana MPPT.
- Baterías LFP: DoD, C-rate, round-trip split entre carga y descarga.
- Balance horario (12 días típicos × 24 h, escalado al año) on-grid / híbrido / off-grid / portátil.
- Demanda por **electrodomésticos** (nevera, aire, ducha, camping…): kWh/día y curva de 24 h, en techo y en kit portátil.
- Economía: CAPEX, LCOE, payback, VPN. Comparador de proveedores.

Los precios del catálogo son **de lista ilustrativos** (USD → COP) para comparar arquitectura de costos, no una cotización comercial.

Hay dos vistas: **Para mí** (veredicto en español, aparatos y gráficas del día) y **Técnico** (equipos, LCOE, pérdidas y comparador).

## Cómo correrlo

```bash
pnpm install
pnpm test
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/engine/     modelo físico y económico (sin React)
src/data/       ciudades Colombia + catálogo de equipos + electrodomésticos
src/components/ escena 3D y UI del simulador
src/store/      estado de diseño (Zustand)
```

## Próximos pasos naturales

- Series horarias reales (PVGIS / NREL) por coordenada.
- Editor 3D de techos con obstáculos y sombras.
- PDF de informe y más distribuidores.
