/**
 * Mock FoundryVTT Environment for Integration Testing
 * 
 * This creates a minimal mock of FoundryVTT's global objects and APIs
 * to enable testing the MediaSoup plugin without requiring FoundryVTT sources.
 */

// Mock jQuery-like function for DOM manipulation
function mockJQuery(selector) {
    const elements = typeof selector === 'string' ? 
        Array.from(document.querySelectorAll(selector)) : 
        [selector].filter(Boolean);
    
    const jqObj = {
        length: elements.length,
        
        // Add jQuery-like methods
        find: (childSelector) => mockJQuery(childSelector),
        append: (content) => {
            elements.forEach(el => {
                if (typeof content === 'string') {
                    el.insertAdjacentHTML('beforeend', content);
                } else if (content.nodeType) {
                    el.appendChild(content);
                }
            });
            return jqObj;
        },
        after: (content) => {
            elements.forEach(el => {
                if (typeof content === 'string') {
                    el.insertAdjacentHTML('afterend', content);
                } else if (content.nodeType) {
                    el.parentNode.insertBefore(content, el.nextSibling);
                }
            });
            return jqObj;
        },
        remove: () => {
            elements.forEach(el => el.remove());
            return jqObj;
        },
        attr: (name, value) => {
            if (value !== undefined) {
                elements.forEach(el => el.setAttribute(name, value));
                return jqObj;
            }
            return elements[0]?.getAttribute(name);
        },
        data: (name, value) => {
            if (value !== undefined) {
                elements.forEach(el => el.dataset[name] = value);
                return jqObj;
            }
            return elements[0]?.dataset[name];
        },
        val: (value) => {
            if (value !== undefined) {
                elements.forEach(el => el.value = value);
                return jqObj;
            }
            return elements[0]?.value;
        },
        is: (selector) => {
            return elements.some(el => el.matches(selector));
        },
        each: (callback) => {
            elements.forEach((el, index) => callback.call(el, index, el));
            return jqObj;
        },
        get: (index) => elements[index],
        eq: (index) => mockJQuery(elements[index]),
        addClass: (className) => {
            elements.forEach(el => el.classList.add(className));
            return jqObj;
        },
        removeClass: (className) => {
            elements.forEach(el => el.classList.remove(className));
            return jqObj;
        },
        on: (event, handler) => {
            elements.forEach(el => el.addEventListener(event, handler));
            return jqObj;
        }
    };
    
    // Make it array-like
    elements.forEach((el, index) => {
        jqObj[index] = el;
    });
    
    return jqObj;
}

// Mock FoundryVTT Settings API
class MockSettings {
    constructor() {
        this.settings = new Map();
        this.menus = new Map();
    }
    
    register(module, key, options) {
        const fullKey = `${module}.${key}`;
        this.settings.set(fullKey, {
            ...options,
            value: options.default
        });
        console.log(`[MockFoundry] Registered setting: ${fullKey}`, options);
    }
    
    registerMenu(module, key, options) {
        const fullKey = `${module}.${key}`;
        this.menus.set(fullKey, options);
        console.log(`[MockFoundry] Registered menu: ${fullKey}`, options);
    }
    
    get(module, key) {
        const fullKey = `${module}.${key}`;
        const setting = this.settings.get(fullKey);
        return setting ? setting.value : undefined;
    }
    
    set(module, key, value) {
        const fullKey = `${module}.${key}`;
        const setting = this.settings.get(fullKey);
        if (setting) {
            setting.value = value;
            // Trigger onChange if defined
            if (setting.onChange) {
                setting.onChange(value);
            }
        }
        console.log(`[MockFoundry] Set setting ${fullKey} = ${value}`);
    }
    
    // Get all registered settings for testing
    getAllSettings() {
        return Array.from(this.settings.entries()).map(([key, setting]) => ({
            key,
            ...setting
        }));
    }
    
    // Get all registered menus for testing
    getAllMenus() {
        return Array.from(this.menus.entries()).map(([key, menu]) => ({
            key,
            ...menu
        }));
    }
}

// Mock UI Notifications
class MockNotifications {
    constructor() {
        this.notifications = [];
    }
    
    info(message, options = {}) {
        const notification = { type: 'info', message, options, timestamp: Date.now() };
        this.notifications.push(notification);
        console.log(`[MockFoundry] INFO: ${message}`, options);
        return notification;
    }
    
    warn(message, options = {}) {
        const notification = { type: 'warn', message, options, timestamp: Date.now() };
        this.notifications.push(notification);
        console.warn(`[MockFoundry] WARN: ${message}`, options);
        return notification;
    }
    
    error(message, options = {}) {
        const notification = { type: 'error', message, options, timestamp: Date.now() };
        this.notifications.push(notification);
        console.error(`[MockFoundry] ERROR: ${message}`, options);
        return notification;
    }
    
    // Get all notifications for testing
    getAll() {
        return [...this.notifications];
    }
    
    // Clear notifications
    clear() {
        this.notifications = [];
    }
    
    // Get notifications by type
    getByType(type) {
        return this.notifications.filter(n => n.type === type);
    }
}

// Mock Hooks System
class MockHooks {
    constructor() {
        this.hooks = new Map();
    }
    
    on(event, callback) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event).push(callback);
        console.log(`[MockFoundry] Registered hook: ${event}`);
    }
    
    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }
    
    off(event, callback) {
        if (this.hooks.has(event)) {
            const callbacks = this.hooks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    call(event, ...args) {
        console.log(`[MockFoundry] Calling hook: ${event}`, args);
        if (this.hooks.has(event)) {
            const callbacks = this.hooks.get(event);
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`[MockFoundry] Error in hook ${event}:`, error);
                }
            });
        }
    }
    
    // Get registered hooks for testing
    getRegisteredHooks() {
        return Array.from(this.hooks.keys());
    }
}

// Mock Player List
class MockPlayerList {
    constructor() {
        this.players = new Map();
    }
    
    render(force = false) {
        console.log(`[MockFoundry] PlayerList.render(${force})`);
        // Trigger renderPlayerList hook
        window.Hooks.call('renderPlayerList', this, mockJQuery('#player-list'), {});
    }
    
    addPlayer(userId, userData) {
        this.players.set(userId, userData);
        this.render();
    }
    
    removePlayer(userId) {
        this.players.delete(userId);
        this.render();
    }
}

// Mock Scene Controls
function mockSceneControls() {
    return {
        controls: [],
        activeControl: null,
        render: (force = false) => {
            console.log(`[MockFoundry] SceneControls.render(${force})`);
        }
    };
}

// Mock Game Object
function createMockGame() {
    return {
        version: '13.330',
        userId: 'test-user-123',
        settings: new MockSettings(),
        user: {
            id: 'test-user-123',
            name: 'Test User',
            isGM: true
        },
        users: new Map([
            ['test-user-123', { id: 'test-user-123', name: 'Test User', isGM: true }],
            ['test-user-456', { id: 'test-user-456', name: 'Test Player', isGM: false }]
        ])
    };
}

// Mock UI Object
function createMockUI() {
    return {
        notifications: new MockNotifications(),
        players: new MockPlayerList(),
        controls: mockSceneControls()
    };
}

// Initialize Mock Environment
export function initializeMockFoundryVTT() {
    console.log('[MockFoundry] Initializing mock FoundryVTT environment...');
    
    // Set up global objects
    window.$ = mockJQuery;
    window.jQuery = mockJQuery;
    window.game = createMockGame();
    window.ui = createMockUI();
    window.Hooks = new MockHooks();
    
    // Create basic DOM structure for player list
    const playerListHTML = `
        <div id="player-list" class="app">
            <ol class="players-list">
                <li class="player" data-user-id="test-user-123">
                    <h3 class="player-name">Test User</h3>
                </li>
                <li class="player" data-user-id="test-user-456">
                    <h3 class="player-name">Test Player</h3>
                </li>
            </ol>
        </div>
    `;
    
    // Create scene controls structure
    const sceneControlsHTML = `
        <div id="controls" class="app">
            <ol class="scene-control-buttons"></ol>
        </div>
    `;
    
    // Add to document if not exists
    if (!document.getElementById('player-list')) {
        document.body.insertAdjacentHTML('beforeend', playerListHTML);
    }
    if (!document.getElementById('controls')) {
        document.body.insertAdjacentHTML('beforeend', sceneControlsHTML);
    }
    
    // Add CSS for minimal styling
    const styles = `
        <style id="mock-foundry-styles">
            #player-list {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 200px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
            }
            
            .players-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .player {
                margin-bottom: 10px;
                padding: 5px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            
            .player-name {
                margin: 0;
                font-size: 14px;
            }
            
            #controls {
                position: fixed;
                left: 10px;
                top: 10px;
                background: rgba(0,0,0,0.8);
                padding: 10px;
                border-radius: 5px;
            }
            
            .scene-control-buttons {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                gap: 5px;
            }
            
            .mediasoup-video-container {
                margin-top: 5px;
                border-radius: 3px;
                overflow: hidden;
                background: black;
            }
            
            .mediasoup-remote-video {
                width: 100%;
                height: auto;
                display: block;
            }
        </style>
    `;
    
    if (!document.getElementById('mock-foundry-styles')) {
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    console.log('[MockFoundry] Mock FoundryVTT environment initialized');
    
    // Return the mock objects for testing access
    return {
        game: window.game,
        ui: window.ui,
        Hooks: window.Hooks,
        $: window.$
    };
}

// Helper function to trigger common FoundryVTT lifecycle events
export function triggerFoundryLifecycle() {
    console.log('[MockFoundry] Triggering FoundryVTT lifecycle events...');
    
    // Simulate FoundryVTT initialization sequence
    setTimeout(() => {
        window.Hooks.call('init');
    }, 100);
    
    setTimeout(() => {
        window.Hooks.call('ready');
    }, 200);
    
    setTimeout(() => {
        window.Hooks.call('getSceneControlButtons', []);
    }, 300);
}

// Helper to get test results
export function getTestResults() {
    return {
        settings: window.game.settings.getAllSettings(),
        menus: window.game.settings.getAllMenus(),
        notifications: window.ui.notifications.getAll(),
        hooks: window.Hooks.getRegisteredHooks()
    };
}