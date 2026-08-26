# Solara — diseño del simulador solar

Fecha: 2026-08-26

## Objetivo

Permitir diseñar una instalación FV (paneles, inversor, baterías), verla en 3D y obtener un balance energético y económico comparable entre proveedores.

## Stack

- Next.js App Router + TypeScript + Tailwind v4
- React Three Fiber + drei para la escena
- Motor puro en `src/engine` con Vitest
- Zustand para el estado de diseño

## Modelo

1. POA a partir de GHI mensual de la ciudad, perfil diurno senoidal, Erbs, IAM.
2. DC del módulo: G/1000 · Pmax · (1 + γ·(Tcell−25)) · bifacial.
3. Tcell = Tamb + (G/800)·(NOCT−20).
4. Inversor: interpola curva η, recorta a Pac y Pdc máx.
5. Híbrido DC-coupled: primero carga/descarga, luego convierte.
6. Economía: CAPEX desglosado, LCOE con CRF, VPN 25 años.

## Fuera de alcance v1

API meteorológica, sombras 3D de obstáculos, cotización contractual, login.
