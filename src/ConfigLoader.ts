import { resolve } from "path"
import * as fs from "fs"
import { config } from "dotenv"
import dotenvExpand from 'dotenv-expand'
import { loadDefaults } from './SchemaUtils'
import Ajv from 'ajv'
import { JSONSchema7 } from "json-schema"


export function jsonStringify(object: Object, indent: number = null) {
    return JSON.stringify(object, (key, value) => {
        return typeof value === 'bigint'
            ? value.toString()
            : value // return everything else unchanged
    }, indent
    );
}

export class ConfigLoader<IConfigInterface> {
    public readonly dotEnvPath: string

    constructor(public readonly configSchema: JSONSchema7, dotEnvPath: string = null) {
        this.dotEnvPath = dotEnvPath ?? resolve(process.cwd(), ".env")
    }

    _getEnv() {
        if (!fs.existsSync(this.dotEnvPath)) {
            console.warn(`no dotenv file found in ${this.dotEnvPath}`)
            return {}
        }
        return dotenvExpand(config({ path: this.dotEnvPath })).parsed ?? {}
    }

    loadConfig(baseConfig: Record<string, any> = null): IConfigInterface {
        const processEnv = process.env

        let ajv = new Ajv()
        let validator = ajv.compile(this.configSchema)
        let mergedConfig = <IConfigInterface>{
            ...loadDefaults(this.configSchema),
            ...(baseConfig != null ? baseConfig : this._getEnv()),
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
        let env = this._getEnv()
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
