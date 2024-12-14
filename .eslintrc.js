module.exports = {
    'env': {
        'commonjs': true,
        'es6': true,
        'node': true
    },
    // 'extends': 'eslint:recommended',
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 2018
    },
    'rules': {
        'indent': [
            'error',
            2
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': ['error', 'single', { 'avoidEscape': true }],
        'semi': ['error', 'never'],
        // "array-bracket-spacing": ["error", "never"],
        "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
        "eol-last": ["error", "always"],
        "func-call-spacing": ["error", "never"],
        "no-trailing-spaces": "error",
        "space-before-function-paren": ["error", "always"]
    }
}
