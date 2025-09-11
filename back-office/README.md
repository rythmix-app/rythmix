# BackOffice

## Development server

To start a local development server, run:

```bash
docker compose up angular-dev --build
```

To start a local prod server, run:

```bash
docker compose up --build angular-prod
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

The next command should be executed inside the container !

To enter the container run:

For dev:

```bash
docker-compose exec angular-dev sh
```
For prod:

```bash
docker-compose exec angular-prod sh
```

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
npm run ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
npm run ng generate --help
```

## Building

To build the project run:

```bash
npm run ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
npm run ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
npm run ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
