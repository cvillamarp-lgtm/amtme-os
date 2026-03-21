# Deployment Checklist

## ⛔ Gates de Release — Bloqueo Automático

Los siguientes puntos deben verificarse **antes de cualquier release**. Si alguno falla, el release queda **bloqueado**.

| # | Gate | Verificación |
|---|------|-------------|
| G1 | **Sin `.env` real en el repo** | `git ls-files '.env*' \| grep -v '.env.example'` debe devolver vacío. Si devuelve algo, **DETENER release y rotar credenciales.** |
| G2 | **Sin `.env` real en el paquete/ZIP distribuible** | Inspeccionar el artefacto antes de compartir. No debe contener ningún archivo `.env` con valores reales. |
| G3 | **Solo un lockfile** | Solo debe existir `package-lock.json`. No `bun.lock` ni `bun.lockb`. |
| G4 | **Documentación actualizada** | README refleja stack real, sin referencias a herramientas no usadas. |

## Deployment Instructions
1. Ensure the code is merged into the main branch.
2. Check configuration settings for production.
3. Execute deployment scripts:
   ```bash
   ./deploy.sh
   ```
4. Monitor the deployment process for errors.
5. Confirm successful deployment by checking live site.

## Testing Instructions
1. Run automated tests:
   ```bash
   npm run test
   ```
2. Conduct manual testing for critical features.
3. Verify logs for any issues or errors.
4. Document any bugs or areas that require attention.
5. Wait for team confirmation before finalizing the deployment.