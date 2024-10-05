#!/usr/bin/env node

import fs from 'fs'
import { JSONSchema7 } from 'json-schema'
import { ValidatedConfig } from './ValidatedConfig';

// import yargs from 'yargs/yargs';
// see https://remarkablemark.org/blog/2021/10/16/yargs-command-with-positional-argument/


const programName = process.argv[1]
const args = process.argv.slice(2)

const helpText = `
usage: ${programName} <path-to-json-schema> [path-to-env]
[path-to-env] should be a dotenv-like file; if omitted, print out a sample config
`

if (args.length < 1) {
    console.error(helpText)
    process.exit(1)
}

const pathToJsonSchema = process.argv[2]
if (!fs.existsSync(pathToJsonSchema)) {
    console.error(`schema file does not exist at: ${pathToJsonSchema}`)
}

let jsonSchema: JSONSchema7
try {
    jsonSchema = JSON.parse(fs.readFileSync(pathToJsonSchema).toString())
} catch (error) {
    console.error(`error in parsing json schema: ${error}`)
    process.exit(1)
}


function renderSampleConfig(jsonSchema: JSONSchema7) {
    let out = []
    for (const varName of Object.keys(jsonSchema?.properties)) {
        const varSchema = jsonSchema.properties[varName] as JSONSchema7
        if (varSchema?.description != null) {
            out.push((varSchema.description as string).split(/\r?\n/).map(line => {
                return `# ${line}`
            }).join('\n'))
        }
        let varAnnotations = [
            `  # <${varSchema.type}>`
        ]
        let varEnums = varSchema.enum as Array<any>
        if (varEnums != null) {
            varAnnotations.push(
                '(' + (varEnums.map(x => x.toString()).join(' | ')) + ')'
            )
        }
        out.push(`${varName}=${varSchema.default ?? ''}${varAnnotations.join('')}`)
    }
    return out.join('\n')
}


const dotEnvFile = process.argv[3]
if (dotEnvFile == null) {
    console.log(renderSampleConfig(jsonSchema))
    process.exit(0)
} else if (!fs.existsSync(dotEnvFile)) {
    console.error(`dotenv file does not exist at: ${dotEnvFile}`)
    process.exit(1)
} else {
    const validatedConfig = ValidatedConfig.setSchema(jsonSchema).loadDotEnvFile(dotEnvFile)
    console.log(validatedConfig)
}
