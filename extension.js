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
        if (pointer.script && text.match(/<\/script.*>/i)) {
            pointer.script = false
        }
        if (pointer.script && text.trim()) {
            if (text.match(/export default/i)) {
                pointer.module = true
            }
            scope[pointer.module ? 'module' : 'import'].push({ text, lineNumber })
        }
        if (!pointer.script && text.match(/<script.*>/i)) {
            pointer.script = true
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

const chunk = () => {
    const order = {
        el: [],
        name: [],
        components: [],
        filters: [],
        mixins: [],
        layout: [],
        props: [],
        data: [],
        fetch: [],
        head: [],
        computed: [],
        watch: [],
        beforeCreate: [],
        created: [],
        beforeMount: [],
        mounted: [],
        beforeDestroy: [],
        methods: [],
        fetchOnServer: [],
    }

    return {}
}

const sort = () => {
    vscode.commands
        .executeCommand('editor.action.formatDocument')
        .then(() => {
            return Promise.resolve(scriptBlock())
        })
        .then((script) => {
            return Promise.allSettled([script.import.length ? sortImport(script.import) : Promise.resolve()])
        })
        .then(() => {
            return vscode.commands.executeCommand('editor.action.formatDocument')
        })
        .then(() => {
            console.log('order')
        })
        .catch(({ message }) => {
            console.log(message)
        })
}

module.exports = {
    activate: (context) => {
        context.subscriptions.push(vscode.commands.registerCommand('vue-sort.sort', () => sort()))
    },
    deactivate: () => {},
}
