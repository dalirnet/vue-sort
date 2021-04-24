const vscode = require('vscode')

const scriptBlock = () => {
    const { document = { lineCount: 0 } } = vscode.window.activeTextEditor
    const pointer = {
        position: 0,
        script: false,
        module: false,
    }
    const scope = {
        import: [],
        module: [],
    }
    for (pointer.position; pointer.position < document.lineCount; pointer.position++) {
        let { text, lineNumber } = document.lineAt(pointer.position)

        if (document.languageId == 'vue') {
            if (pointer.script && text.match(/<\/script.*>/i)) {
                pointer.script = false
            }
        }

        if ((document.languageId == 'javascript' || pointer.script) && text.trim()) {
            if (text.match(/export default/i)) {
                pointer.module = true
            }
            scope[pointer.module ? 'module' : 'import'].push({ text, lineNumber })
        }

        if (document.languageId == 'vue') {
            if (!pointer.script && text.match(/<script.*>/i)) {
                pointer.script = true
            }
        }
    }

    return scope
}

const sortImport = (lines) => {
    const range = {
        startLine: -1,
        startCharacter: 0,
        endLine: -1,
        endCharacter: 0,
    }
    const chunk = lines.reduce(
        (out, { text, lineNumber }) => {
            let type = text.match(/@/) ? 'share' : text.match(/~/) ? 'local' : 'global'
            if (type === 'global') {
                out.global.push(text)
            } else {
                let scope = text.match(/\/component/) ? 'component' : text.match(/\/mixin/) ? 'mixin' : 'lib'
                out[type][scope].push(text)
            }
            if (range.startLine === -1) {
                range.startLine = lineNumber
            }
            if (range.endLine < lineNumber) {
                range.endLine = lineNumber
                range.endCharacter = text.length
            }

            return out
        },
        {
            global: [],
            share: {
                lib: [],
                mixin: [],
                component: [],
            },
            local: {
                lib: [],
                mixin: [],
                component: [],
            },
        }
    )

    return vscode.window.activeTextEditor.edit((builder) => {
        builder.replace(
            new vscode.Range(range.startLine, range.startCharacter, range.endLine, range.endCharacter),
            [
                ...chunk.global.sort(),
                ...chunk.share.lib.sort(),
                ...chunk.share.mixin.sort(),
                ...chunk.share.component.sort(),
                ...chunk.local.lib.sort(),
                ...chunk.local.mixin.sort(),
                ...chunk.local.component.sort(),
            ].join('\n')
        )
    })
}

const sortModule = (lines) => {
    const range = {
        startLine: -1,
        startCharacter: 0,
        endLine: -1,
        endCharacter: 0,
    }
    const scopes = [
        'el',
        'name',
        'components',
        'filters',
        'mixins',
        'layout',
        'middleware',
        'validate',
        'model',
        'props',
        'data',
        'setup',
        'fetch',
        'head',
        'computed',
        'watch',
        'beforeCreate',
        'created',
        'beforeMount',
        'mounted',
        'beforeDestroy',
        'methods',
        'fetchOnServer',
    ]

    const chunk = lines.reduce(
        (out, { text, lineNumber }, index) => {
            if (index > 0 && index < lines.length - 1) {
                if (index === 1) {
                    range.startLine = lineNumber
                    out.space = text.match(/^(\s+|)/)[0].length
                }
                if (range.endLine < lineNumber) {
                    range.endLine = lineNumber
                    range.endCharacter = text.length
                }
                let match = text.match(new RegExp('^(\\s{' + out.space + '})(\\w+)((\\s+|)(:|\\())'))
                if (match) {
                    out.scope = match[2]
                }
                if (out.scope) {
                    if (!out.keep.hasOwnProperty(out.scope)) {
                        out.keep[out.scope] = []
                    }

                    out.keep[out.scope].push(text)
                }
            }

            return out
        },
        {
            space: 0,
            scope: null,
            keep: {},
        }
    ).keep

    if (chunk.hasOwnProperty('components')) {
        if (chunk.components.length > 2) {
            chunk.components = [chunk.components[0], ...chunk.components.slice(1, -1).sort(), chunk.components[chunk.components.length - 1]]
        }
    }

    if (chunk.hasOwnProperty('mixins')) {
        if (chunk.mixins.length > 2) {
            chunk.mixins = [chunk.mixins[0], ...chunk.mixins.slice(1, -1).sort(), chunk.mixins[chunk.mixins.length - 1]]
        } else if (chunk.mixins.length == 1) {
            const match = chunk.mixins[0].match(/^(.*\[)(.*)(\].*,)$/)
            if (match) {
                const sort = match[2]
                    .split(',')
                    .map((e) => e.trim())
                    .sort()
                    .join(', ')
                chunk.mixins = [match[1] + sort + match[3]]
            }
        }
    }

    return vscode.window.activeTextEditor.edit((builder) => {
        builder.replace(
            new vscode.Range(range.startLine, range.startCharacter, range.endLine, range.endCharacter),
            scopes
                .reduce((out, scope) => {
                    if (chunk.hasOwnProperty(scope)) {
                        out.push(...chunk[scope])
                    }

                    return out
                }, [])
                .join('\n')
        )
    })
}

const sort = () => {
    vscode.commands
        .executeCommand('editor.action.formatDocument')
        .then(() => {
            return Promise.resolve(scriptBlock())
        })
        .then((script) => {
            return new Promise((resolve, reject) => {
                if (script.import.length) {
                    sortImport(script.import)
                        .then(() => {
                            resolve(script)
                        })
                        .catch((e) => {
                            reject(e)
                        })
                } else {
                    resolve(script)
                }
            })
        })
        .then((script) => {
            return new Promise((resolve, reject) => {
                if (script.module.length) {
                    sortModule(script.module)
                        .then(() => {
                            resolve()
                        })
                        .catch((e) => {
                            reject(e)
                        })
                } else {
                    resolve()
                }
            })
        })
        .then(() => {
            return vscode.commands.executeCommand('editor.action.formatDocument')
        })
        .then(() => {
            vscode.window.setStatusBarMessage('Sorted vue component', 3000)
        })
        .catch(({ message }) => {
            vscode.window.showErrorMessage(message)
        })
}

module.exports = {
    activate: (context) => {
        context.subscriptions.push(vscode.commands.registerCommand('vue-sort.sort', () => sort()))
    },
    deactivate: () => {},
}
