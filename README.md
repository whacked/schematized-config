# schematized-config

a library for loading configurations from `.env`, JSON, or plain JS/TS objects, validated or hydrated against a JSON schema with or without defaults.

# usage

The main class is `ValidatedConfig`. Assuming a `.env` file with the following:

```conf
DATABASE_NAME=my-db
```

```typescript
import { ValidatedConfig, ValidationStrictness } from 'schematized-config'


interface MySchema {
    FOO: string,
    BLUE?: number,
    URL?: string,
    DATABASE_NAME: string,
}

const config = ValidatedConfig.setSchema({
    type: 'object',
    properties: {
        FOO: {
            type: 'string',
            default: 'bar'
        },
        BLUE: {
            type: 'number',
        },
        URL: {
            type: 'string',
        },
        DATABASE_NAME: {
            type: 'string',
        },
    },
    required: [
        'FOO',
        'DATABASE_NAME',
    ]
}).load<MySchema>()

console.log(config)
// > { FOO: 'bar', BLUE: undefined, URL: undefined, DATABASE_NAME: 'my-db' }
```

By default, `ValidatedConfig` will attempt to read a configuration from `.env` using the `dotenv` library. The structure is validated against the JSON schema passed to `setSchema`. In this case, `FOO` and `DATABASE_NAME` are required entries, so `FOO` receives the schema default of `bar`; if no `DATABASE_NAME` was set in `.env`, the validation throws a validation error via `ajv`.

That's it. In practice, it is cumbersome to have to define a JSON schema and its interface at the same time. To automate this process, consider using [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) to auto-generate typescript interfaces from your schemas. For composability across schemas, consider using [jsonnet](https://jsonnet.org/) to generate and maintain your schemas.