# Contributing to Stellode

Thanks for contributing. This guide keeps the bar low and the process clear.

## Getting started

1. Fork the repository and create a branch from `main`.
2. Copy `.env.example` to `.env`.
3. Install dependencies: `npm install`
4. Start Neo4j: `npm run docker:up`
5. Run backend: `npm run b`
6. Run frontend: `npm run f`
7. Optional demo data: `npm run db:reset`

## Development guidelines

- Prefer small, focused pull requests.
- Follow the existing functional TypeScript style: no `any`, explicit types, pure functions where practical, no mutation of shared data.
- Backend: NestJS modules per domain; controllers stay thin; Neo4j access via parameterized Cypher.
- Frontend: functional React components; shared types from `@stellode/models` only (not from `apps/backend`).
- After changes in `libs/models`, run `npx nx run models:build`.
- Domain rules live in `docs/spec.md` — keep code aligned with the spec.

## Tests and checks

```bash
npm test
npm run test:ci
```

Add or update tests for behavior you change. Prefer covering services and pure helpers.

## Pull requests

1. Describe the problem and the solution.
2. Link related issues when applicable.
3. Note how you tested the change.
4. Keep the diff scoped to the request — avoid unrelated refactors.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE.md).
