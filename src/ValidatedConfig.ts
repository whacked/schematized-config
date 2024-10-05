import Ajv from 'ajv'
import { JSONSchema7 } from "json-schema"
import { ValidatorDotEnvConfigSchema } from './autogen/interfaces/ValidatorDotEnvConfig'


const nameof = <T>(name: keyof T) => name;


const processEnv = typeof process == "undefined" ? {} : process.env
const processCwd = typeof process == "undefined" ? null : process.cwd()

/**
 * wrapper for dotenvExpand to make it work in the browser
 * @param config supposed to be dotenv-parsed object, i.e. { parsed: {...} }
 * @returns dotenvExpand-like result, i.e. also { parsed: {...} }
 */
function dotenvExpand(config: object) {
    if (typeof process == "undefined") {
        // NOTE: dotenvExpand expects an object
        // with a `parsed` property; but this conditional
        // should ONLY get called when dotenvExpand is unavailable,
        // i.e. in the browser; since dotenvExpand's output _also_
        // has a `parsed` property, we return the input as-is.
        return config
    } else {
        return require('dotenv-expand')(config)
    }
}


export enum ValidationStrictness {
    REQUIRE_FULL_CONFORMANCE,
    WARN_ON_NONCONFORMANCE,
    UNSTRICT,
}
export class ValidatedConfig {

    // use this envvar to control load-time verbosity
    static readonly STRICTNESS_LEVEL_ENVIRONMENT_VARIABLE = nameof<ValidatorDotEnvConfigSchema>("VALIDATED_CONFIG_STRICTNESS_LEVEL")

    static getEnvStrictnessLevel(): ValidationStrictness {
        let envSpecifiedStrictnessLevel = (processEnv[ValidatedConfig.STRICTNESS_LEVEL_ENVIRONMENT_VARIABLE] ?? '').toLowerCase()
        switch (envSpecifiedStrictnessLevel) {
            case 'full':
                return ValidationStrictness.REQUIRE_FULL_CONFORMANCE
            case 'warn':
                return ValidationStrictness.WARN_ON_NONCONFORMANCE
            case 'none':
                return ValidationStrictness.UNSTRICT
        }
        return null
    }

    static configSchema: JSONSchema7 = null

    static setSchema(jsonSchemaObject: JSONSchema7 | Record<string, any>) {
        ValidatedConfig.configSchema = jsonSchemaObject as JSONSchema7
        return ValidatedConfig
    }

    /**
     * load properties with "default": value set from a json schema,
     * applies shell variable expansion on string values, and returns
     * the resulting object
     */
    static loadDefaults<ConfigSchema>(schema: JSONSchema7): ConfigSchema {
        let out = <ConfigSchema>{}
        if (schema?.properties == null) {
            return out
        }

        let expandables: Record<string, string> = {}
        Object.keys(schema.properties).forEach((key) => {
            let itemConfig = schema.properties[key] as JSONSchema7
            if (itemConfig.type == "object") {
                out[key] = ValidatedConfig.loadDefaults(itemConfig)
            } else if (itemConfig.default) {
                if (itemConfig.type == "string") {
                    expandables[key] = itemConfig.default as string
                } else {
                    out[key] = itemConfig.default
                }
            }
        })

        return {
            ...out,
            ...dotenvExpand({ parsed: expandables }).parsed,
        }
    }

    static loadDotEnvFile<ConfigSchema>(
        dotEnvFilePath: string | null = null,
        strictnessLevel: ValidationStrictness = null,
    ) {
        if (dotEnvFilePath == null) {
            dotEnvFilePath = require('path').resolve(processCwd, ".env")
        }

        if (strictnessLevel == null) {
            strictnessLevel = ValidatedConfig.getEnvStrictnessLevel() ?? ValidationStrictness.WARN_ON_NONCONFORMANCE
        }

        return ValidatedConfig.load<ConfigSchema>(
            dotenvExpand(require('dotenv').config({ path: dotEnvFilePath })).parsed, strictnessLevel,
        )
    }

    static load<ConfigSchema>(
        configSource: Object | ValidationStrictness = null,
        strictnessLevel: ValidationStrictness = null,
    ): ConfigSchema {
        let incomingConfig: object

        if (configSource == null) {  // called with no arguments
            incomingConfig = processEnv
            strictnessLevel = ValidationStrictness.UNSTRICT
        } else if (typeof configSource != "object") {
            incomingConfig = processEnv
        } else {
            incomingConfig = dotenvExpand({ parsed: configSource }).parsed
        }

        let ajv = new Ajv({ strict: false })
        if (ValidatedConfig.configSchema == null) {
            console.warn('WARN: no schema is set; output will be the default config as-is')
            return processEnv as any
        }
        let validator = ajv.compile(ValidatedConfig.configSchema ?? {})
        let mergedConfig = ValidatedConfig.loadDefaults<ConfigSchema>(ValidatedConfig.configSchema)

        let incomingConfigKeyErrors = []
        Object.keys(ValidatedConfig.configSchema?.properties || {}).forEach((key) => {
            let value = incomingConfig[key]  // FIXME: what to do about this and (process.env || env[key])?
            switch (ValidatedConfig.configSchema.properties[key]['type']) {
                case 'number':
                    let parsedValue = Number(value)
                    if (value != null && Number.isNaN(parsedValue)) {
                        incomingConfigKeyErrors.push(`FAILED TO PARSE NUMBER for ${key}: ${value}`)
                    }
                    value = parsedValue
                    break;
                case 'boolean':
                    try {
                        value = JSON.parse(value)
                    } catch (e) {
                        incomingConfigKeyErrors.push(`FAILED TO PARSE BOOLEAN for ${key}: ${value}`)
                    }
                    break;
                default:
                    break;
            }
            mergedConfig[key] = (value != null && !Number.isNaN(value)) ? value : mergedConfig[key]
        })

        if (incomingConfigKeyErrors.length > 0) {
            switch (strictnessLevel) {
                case ValidationStrictness.REQUIRE_FULL_CONFORMANCE:
                    for (const warning of incomingConfigKeyErrors) {
                        console.warn(warning)
                    }
                    throw new Error('full conformance failed')
                    break
                case ValidationStrictness.WARN_ON_NONCONFORMANCE:
                    for (const warning of incomingConfigKeyErrors) {
                        console.warn(warning)
                    }
                    break
                default:
                    break
            }
        }

        validator(mergedConfig)
        if (validator.errors) {
            validator.errors.forEach((error) => {
                console.warn(`VALIDATION FAILURE:`, error)
            })
            console.log("MERGED CONFIG", mergedConfig)
            throw new Error(`failed to validate schema on start`)
        }

        if (strictnessLevel == ValidationStrictness.WARN_ON_NONCONFORMANCE) {
            let inputKeys = Object.keys(incomingConfig || {})
            let mergedConfigKeys = Object.keys(mergedConfig)

            let showKeyLength: number = inputKeys.concat(mergedConfigKeys).reduce((maxLength, curLength) => {
                return Math.max(maxLength, curLength.length)
            }, 0)

            let warningMessages: Array<string> = []
            mergedConfigKeys.forEach((key) => {
                if (!incomingConfig[key]) {
                    let useDefault = mergedConfig[key] ? ` => using default: ${mergedConfig[key]}` : ''
                    warningMessages.push(`!!! WARNING !!!\t${key.padEnd(showKeyLength, ' ')} exists in schema but not in env  ${useDefault}`)
                }
            })

            inputKeys.forEach((key) => {
                if (!mergedConfig[key]) {
                    warningMessages.push(`!!! WARNING !!!\t${key.padEnd(showKeyLength, ' ')} exists in env   but not in schema`)
                }
            })

            if (warningMessages.length > 0) {
                console.warn(`*** WARNINGS FOUND; to change the warning level, set the ${ValidatedConfig.STRICTNESS_LEVEL_ENVIRONMENT_VARIABLE} environment variable ***`)
                console.warn(warningMessages.join('\n'))
            }

        }

        return mergedConfig
    }
}
