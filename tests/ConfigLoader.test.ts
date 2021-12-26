import { JSONSchema7 } from 'json-schema'
import path from 'path'
import { ConfigLoader } from '../src/ConfigLoader'
import { loadDefaults } from '../src/SchemaUtils'


interface IMyConfig {
    MY_STRING_ENVVAR: string,
    MY_INTEGER_ENVVAR: number,
    MY_FLOAT_ENVVAR: number,
    MY_BOOLEAN_ENVVAR: boolean,
}

let configSchema: JSONSchema7 = {
    type: 'object',
    properties: {
        MY_STRING_ENVVAR: {
            type: 'string',
            default: 'blahblah',
        },
        MY_INTEGER_ENVVAR: {
            type: 'integer',
            default: 123,
        },
        MY_FLOAT_ENVVAR: {
            type: 'number',
            default: 4.56,
        },
        MY_BOOLEAN_ENVVAR: {
            type: 'boolean',
            default: true,
        },
    }
}

const defaults = loadDefaults(configSchema)

const TEST_DOTENV_FILE = path.join(__dirname, 'sampleDotEnv')

describe('config loader', () => {
    let configLoader = new ConfigLoader<IMyConfig>(configSchema, TEST_DOTENV_FILE)

    test('test loading precedence from dotenv file', () => {
        expect(configLoader.checkEnv()).toEqual([
            'MY_EXTRA_KEY',
        ])
        expect(configLoader.loadConfig()).toEqual({
            MY_STRING_ENVVAR: 'blahblah',
            MY_INTEGER_ENVVAR: 999,
            MY_FLOAT_ENVVAR: 4.56,
            MY_BOOLEAN_ENVVAR: true,
            MY_EXTRA_KEY: 'find-me',
        })
    })

    test('test defaults from schema', () => {
        expect(configLoader.loadConfig()).toEqual({
            ...defaults,
            MY_INTEGER_ENVVAR: 999,
            MY_EXTRA_KEY: 'find-me',
        })
    })

    test('defaults from non-full schema', () => {
        let clonedConfigSchema = JSON.parse(JSON.stringify(configSchema))
        delete clonedConfigSchema['properties']['MY_FLOAT_ENVVAR']['default']
        let configLoader2 = new ConfigLoader<IMyConfig>(clonedConfigSchema, TEST_DOTENV_FILE)
        expect(configLoader2.loadConfig()).toEqual({
            MY_STRING_ENVVAR: 'blahblah',
            MY_INTEGER_ENVVAR: 999,
            MY_BOOLEAN_ENVVAR: true,
            MY_EXTRA_KEY: 'find-me',
        })
    })

    test('overwrite by env', () => {
        process.env['MY_STRING_ENVVAR'] = 'overwrite-by-env'
        process.env['MY_FLOAT_ENVVAR'] = '3.14'
        process.env['MY_BOOLEAN_ENVVAR'] = 'false'
        expect(configLoader.loadConfig()).toEqual({
            MY_STRING_ENVVAR: 'overwrite-by-env',
            MY_INTEGER_ENVVAR: 999,
            MY_FLOAT_ENVVAR: 3.14,
            MY_BOOLEAN_ENVVAR: false,
            MY_EXTRA_KEY: 'find-me',
        })
    })
})
