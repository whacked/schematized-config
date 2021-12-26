import { loadDefaults } from '../src/SchemaUtils'


test('load defaults', async () => {
    expect(loadDefaults({
        properties: {
            dog: {
                type: 'string',
                default: 'samoyed',
            },
            cat: {
                type: 'string',
            },
        }
    }, true)).toEqual({
        dog: 'samoyed',
        cat: null,
    })

    expect(loadDefaults({
        properties: {
            boat: {
                type: 'object',
                properties: {
                    color: {
                        type: 'string',
                        default: 'blue',
                    },
                    speed: {
                        type: 'object',
                        properties: {
                            magnitude: {
                                type: 'number',
                                default: 23,
                            },
                            referenceFrame: {
                                type: 'string',
                            }
                        }
                    },
                }
            },
            flags: {
                type: 'array',
                default: [1, 2, 3],
            },
            callSign: {
                type: 'array',
            },
            superDuck: {
                type: 'boolean',
                default: true,
            }
        }
    })).toEqual({
        boat: {
            color: 'blue',
            speed: {
                magnitude: 23,
            },
        },
        flags: [1, 2, 3],
        superDuck: true,
    })
})
