# Deployment Checklist

## Gates de release — verificar antes de cualquier deploy

- [ ] Solo hay un lockfile en el repo (`package-lock.json`). No debe existir `bun.lock`, `bun.lockb`, `yarn.lock` ni `pnpm-lock.yaml`.
- [ ] El archivo `.env` real **no existe** en el repositorio ni en el paquete/ZIP distributivo (solo `.env.example` con placeholders).
- [ ] El README refleja el stack real y los comandos de instalación usan exclusivamente `npm`.

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