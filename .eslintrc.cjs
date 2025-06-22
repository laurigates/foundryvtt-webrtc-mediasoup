module.exports = {
    env: {
        browser: true,
        es2021: true,
        jquery: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    },
    globals: {
        // FoundryVTT globals
        game: 'readonly',
        canvas: 'readonly',
        ui: 'readonly',
        Hooks: 'readonly',
        CONFIG: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        Scene: 'readonly',
        User: 'readonly',
        Roll: 'readonly',
        ChatMessage: 'readonly',
        Macro: 'readonly',
        Playlist: 'readonly',
        JournalEntry: 'readonly',
        RollTable: 'readonly',
        Folder: 'readonly',
        Compendium: 'readonly',
        Setting: 'readonly',
        SettingsConfig: 'readonly',
        
        // MediaSoup globals
        mediasoupClient: 'readonly',
        
        // Browser globals
        WebSocket: 'readonly',
        MediaStream: 'readonly',
        navigator: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        $: 'readonly'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        'no-console': 'off'
    }
};