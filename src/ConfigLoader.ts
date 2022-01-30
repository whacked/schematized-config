import { resolve } from "path"
import { config } from "dotenv"
import { loadDefaults } from './SchemaUtils'
import { JSONSchema7 } from "json-schema"
import dotenvExpand from 'dotenv-expand'
import Ajv from 'ajv'


export function jsonStringify(object: Object, indent: number = null) {
    return JSON.stringify(object, (key, value) => {
        return typeof value === 'bigint'
            ? value.toString()
            : value // return everything else unchanged
    }, indent
    );
}

function _loadDotEnv(dotEnvPath: string) {
    try {
        const fs = require('fs')
        if (!fs.existsSync(dotEnvPath)) {
            console.warn(`no dotenv file found in ${dotEnvPath}`)
        }
        return dotenvExpand(config({ path: dotEnvPath })).parsed ?? {}
    } catch (e) {
        console.warn('could not load fs module', e)
    }
    return {}
}

export class ConfigLoader<IConfigInterface> {
    public readonly dotEnvPath: string

    constructor(public readonly configSchema: JSONSchema7, dotEnvPath: string = null) {
        this.dotEnvPath = dotEnvPath ?? resolve(process.cwd(), ".env")
    }

    loadConfig(baseConfig: Record<string, any> = null): IConfigInterface {
        const processEnv = typeof process !== 'undefined' ? process.env : {}

        let ajv = new Ajv()
        let validator = ajv.compile(this.configSchema)
        let mergedConfig = <IConfigInterface>{
            ...loadDefaults(this.configSchema),
            ...(baseConfig != null ? baseConfig : _loadDotEnv(this.dotEnvPath)),
        }
        Object.keys(this.configSchema.properties).forEach((key) => {
            let value = processEnv[key] || mergedConfig[key]
            let itemConfig = this.configSchema.properties[key] as JSONSchema7
            switch (itemConfig.type) {
                case 'integer':
                    value = typeof value == 'string' ? parseInt(value) : value
                    break;
                case 'number':
                    value = typeof value == 'string' ? parseFloat(value) : value
                    break;
                case 'boolean':
                    try {
                        value = typeof value == 'string' ? JSON.parse(value) : value
                    } catch (e) {
                        console.warn(`FAILED TO PARSE VALUE for ${key}: ${value}`)
                    }
                    break;
                default:
                    break;
            }
            mergedConfig[key] = (value != null && !Number.isNaN(value)) ? value : mergedConfig[key]
        })
        validator(mergedConfig)
        if (validator.errors) {
            validator.errors.forEach((error) => {
                console.warn(`validation failure:`, error)
            })
            throw new Error(`failed to validate schema on start`)
        }
        return mergedConfig
    }

    checkEnv(): Array<string> {
        let env = _loadDotEnv(this.dotEnvPath)
        let warnings = []
        Object.keys(env || {}).forEach((key) => {
            if (!this.configSchema.properties[key]) {
                console.warn(`!!! WARNING !!!  key\t"${key}"\texists in .env but not in schema`)
                warnings.push(key)
            }
        })
        return warnings
    }
}
