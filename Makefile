# Makefile pour headless-lms-payload

# Lancer tous les tests Vitest
test:
	npx vitest run

# Lancer les tests en mode interactif (watch)
test-watch:
	npx vitest

# Lint le projet (si tu utilises eslint)
lint:
	npx eslint .

# Build (si tu as une commande build)
build:
	npm run build

# lance les tests d'integration
integration:
	npx vitest run src/endpoints/__tests__/*.integration.test.ts

