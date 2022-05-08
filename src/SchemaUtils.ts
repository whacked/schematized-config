import { JSONSchema7 } from "json-schema"

/**
 * load properties with "default": value set from a json schema
 * and return it in an object
 */
export function loadDefaults(schema: JSONSchema7, shouldPreserveKeysWithoutDefault: boolean = false): Record<string, any> {
    if (schema.properties == null) {
        return null
    }
    let out: Record<string, any> = {}
    Object.keys(schema.properties).forEach((key) => {
        let itemConfig = schema.properties[key] as JSONSchema7
        if (itemConfig.type == "object") {
            out[key] = loadDefaults(itemConfig)
        } else if (itemConfig.default) {
            out[key] = itemConfig.default
        } else if (shouldPreserveKeysWithoutDefault) {
            out[key] = null
        }
    })
    return out
}
