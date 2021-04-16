const vscode = require('vscode')

const order = [
    'el',
    'name',
    'components',
    'filters',
    'mixins',
    'layout',
    'props',
    'asyncData',
    'data',
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

const sort = () => {
    const textEditor = vscode.window.activeTextEditor
    if (textEditor) {
        let chunk = {
            import: {
                global: {
                    lib: [],
                    mixins: [],
                    components: [],
                },
                local: {
                    lib: [],
                    mixins: [],
                    components: [],
                },
            },
            module: {
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
            },
        }
        let pointerOnScriptBlock = false
        for (let i = 0; i < textEditor.document.lineCount; i++) {
            let { text, lineNumber } = textEditor.document.lineAt(i)
            if (pointerOnScriptBlock && text.match(/<\/script.*>/i)) {
                pointerOnScriptBlock = false
            }
            if (pointerOnScriptBlock) {
                // chunk.push({ lineNumber, text })
            }
            if (!pointerOnScriptBlock && text.match(/<script.*>/i)) {
                pointerOnScriptBlock = true
            }
        }
        console.log(chunk)
    } else {
        vscode.window.showErrorMessage('"RTL Markdown" cannot be installed!')
    }
}

module.exports = {
    activate: (context) => {
        context.subscriptions.push([vscode.commands.registerCommand('vue-sort.sort', () => sort())])
    },
    deactivate: () => {},
}
