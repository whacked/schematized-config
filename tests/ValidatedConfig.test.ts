import { ValidatedConfig } from '../src/ValidatedConfig'


describe('test validated config', () => {

    const testSchema = {
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
            ENV_USER: {
                type: 'string',
            },
        },
        required: [
            'FOO',
            'DATABASE_NAME',
            'ENV_USER',
        ]
    }

    test('no schema, no input loads process.env', () => {
        const myConfig = ValidatedConfig.load<any>()
        expect(myConfig['USER']).toEqual(process.env['USER'])
    })

    test('no schema, with process.env', () => {
        const myConfig = ValidatedConfig.load<any>(process.env)
        expect(myConfig['USER']).toEqual(process.env['USER'])
    })

    test('empty schema = nothing allowed', () => {
        const myConfig = ValidatedConfig.setSchema({}).load()
        expect(myConfig).toEqual({})
    })

    test('use arbitrary object with process.env hydration (assuming node)', () => {
        const myConfig = ValidatedConfig.setSchema(testSchema).load({
            DATABASE_NAME: 'hello.db',
            ENV_USER: '$USER',
        })
        expect(myConfig).toEqual({
            FOO: 'bar',
            BLUE: undefined,
            URL: undefined,
            DATABASE_NAME: 'hello.db',
            ENV_USER: process.env['USER'],
        })

        // for this to throw, you must ensure .env isn't setting e.g. DATABASE_NAME
        expect(() => {
            ValidatedConfig.setSchema(testSchema).load({})
        }).toThrowError()

        expect(() => {
            ValidatedConfig.setSchema(testSchema).load({
                DATABASE_NAME: 9,
            })
        }).toThrowError()
    })

    /*
    test('schema constricting config keys in default', () => {
        // FIXME
    })

    test('load defaults: .env -> process.env, <strictness>, bail on schema violation', () => {
        // FIXME
    })

    test('load specific dotenv file -> process.env, <strictness>', () => {
        // FIXME
    })

    test('load specific dotenv file -> object, ...', () => {
        // FIXME
    })
    */
})