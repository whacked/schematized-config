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

let namespacedConfigSchema = {  // deliberately don't specify type
    type: 'object',
    properties: {
        env: configSchema,
        weather: {
            type: 'object',
            properties: {
                PROBABILITY_OF_RAIN: {
                    type: 'number',
                }
            },
        },
        blankDecoy: {},
        foodTruck: {
            type: 'object',
            properties: {
                numberOfWheels: {
                    type: 'number',
                    default: 4,
                },
                cuisine: {
                    type: 'string',
                },
                color: {
                    type: 'string',
                    default: 'blue',
                },
                speed: {
                    type: 'number',
                }
            },
            required: [
                'numberOfWheels', 'cuisine',
            ]
        },
    }
}
interface NamespacedConfigInterface {  // corresponds to above
    env: any,
    weather: any,
    blankDecoy: any,
    foodTruck: any,
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

    describe('namespaced (nested) configs', () => {

        const nestedConfigLoader = new ConfigLoader<NamespacedConfigInterface>(namespacedConfigSchema as any /* override typecheck error from JSONSchema7 */)

        const workingTestConfig = {
            env: {
                ...defaults,
                MY_INTEGER_ENVVAR: 999,
                MY_EXTRA_KEY: 'find-me',
            },
            weather: {

            },
            carryThru: {
                thisIs: 'unchanged',
            },
            foodTruck: {
                cuisine: 'martian',
                speed: 9.81,
            },
        }

        const basicExpectedOutput = {
            env: {
                MY_STRING_ENVVAR: 'overwrite-by-env',
                MY_INTEGER_ENVVAR: 999,
                MY_FLOAT_ENVVAR: 3.14,
                MY_BOOLEAN_ENVVAR: false,
                MY_EXTRA_KEY: 'find-me',
            },
            weather: {},
            carryThru: {
                thisIs: 'unchanged',
            },
            blankDecoy: undefined,
            foodTruck: {
                numberOfWheels: 4,
                cuisine: 'martian',
                color: 'blue',
                speed: 9.81,
            },
        }

        test('basic usage', () => {
            const nestedConfig = nestedConfigLoader.loadConfig(workingTestConfig)
            expect(nestedConfig).toEqual(basicExpectedOutput)
            expect(nestedConfig.weather).toBeTruthy()  // IDE auto-completion check from NamespacedConfigInterface interface propagation
        })

        test('empty schemas allow all', () => {  // redundant? this is json schema behavior as-is
            expect(nestedConfigLoader.loadConfig({
                ...workingTestConfig,
                blankDecoy: {
                    whatever: 'youWant',
                    isFine: true,
                }
            })).toEqual({
                ...basicExpectedOutput,
                blankDecoy: {
                    whatever: 'youWant',
                    isFine: true,
                },
            })
        })

        test('fallback to default throws because it is null', () => {
            expect(() => {
                nestedConfigLoader.loadConfig()
            }).toThrowError()
        })

        test('incomplete input throws', () => {
            expect(() => {
                nestedConfigLoader.loadConfig({
                    env: {},
                })
            }).toThrowError()
        })

        test('invalid nested value throws', () => {
            expect(() => {
                nestedConfigLoader.loadConfig({
                    ...workingTestConfig,
                    weather: {
                        PROBABILITY_OF_RAIN: 'notNumber',
                    },
                })
            }).toThrowError()
        })

        test('pass-thru of values in optional key', () => {
            expect(nestedConfigLoader.loadConfig({
                ...workingTestConfig,
                weather: {
                    PRECIPITATION: 0,
                },
            })).toEqual({
                ...basicExpectedOutput,
                weather: {
                    PRECIPITATION: 0,
                },
            })
        })

    })

})
