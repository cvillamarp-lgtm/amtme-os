# AMTME OS — Reglas persistentes de cierre operativo

Estas reglas son obligatorias para cualquier sesión de trabajo en este repositorio.
Aplican a Claude Code y a cualquier agente que opere sobre el proyecto.

---

## Regla 1 — Cierre de fix + deploy + QA

Siempre que se haga una implementación que incluya fix funcional, validación, deploy o cierre operativo, **no se puede marcar como CERRADO** hasta ejecutar este protocolo completo:

1. Build/typecheck/tests o validaciones técnicas disponibles
2. Validación funcional del cambio
3. Confirmación de deploy productivo exitoso
4. Confirmación de dominio productivo correcto
5. Verificación de consistencia git con estas salidas:
   - `git remote -v`
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git status --short`
6. Si existe remoto:
   - Verificar hash de `origin/main`
   - Confirmar si `local main = origin/main = commit desplegado`
7. Si no existe remoto o no está alineado:
   - Decirlo explícitamente
   - No afirmar sincronización no comprobada
8. Si el deploy fue directo por CLI y no por push:
   - Declararlo explícitamente
9. Reportar siempre al cierre:
   - Commit exacto en producción
   - Deploy ID o URL
   - Lista final exacta de archivos tocados
   - Estado de sincronización local / remoto / producción
   - Bloqueos reales

---

## Regla 2 — Política global de auth/session

Todo problema de auth/session debe resolverse con **estrategia global reutilizable**. No se permiten parches locales ni patrones duplicados.

**Reglas obligatorias:**
- Usar detector global de errores de auth (`isAuthError` en `src/services/functions/edgeFunctionErrors.ts`)
- Usar handler global de visualización de errores de sesión (`showEdgeFunctionError` / `showSessionExpiredToast`)
- No dejar `toast.error("No autenticado")` o `toast.error("Debes iniciar sesión")` inline
- No dejar checks manuales dispersos por pantalla si existe helper global
- No cerrar un ticket de auth/session si quedan residuos inconsistentes en frontend

---

## Regla 3 — Verdad de cierre

No se puede marcar un trabajo como **CERRADO** si falta cualquiera de estas verificaciones:
- Validación técnica
- Validación funcional
- Validación de producción
- Consistencia real entre local, remoto y producción cuando aplique

---

## Regla 4 — Estilo de reporte

Los reportes finales deben venir compactos y técnicos con este formato:
- **Diagnóstico**
- **Acción**
- **Resultado**
- **Archivos tocados**
- **Bloqueos reales**
- **Estado final**

---

## Activación

Estas reglas se cargan automáticamente al iniciar cualquier sesión de Claude Code en este repositorio (CLAUDE.md raíz). No requieren invocación manual.
