A Developer's Guide to FoundryVTT ModulesThis guide is designed to provide an AI with the foundational knowledge required to develop modules for Foundry Virtual Tabletop (FoundryVTT). It focuses on the core concepts, integration points, and best practices necessary to create robust, compatible, and maintainable modules.1. Core Concepts: Understanding the FoundryVTT EcosystemBefore diving into module development, it's crucial to understand the different types of packages in the FoundryVTT ecosystem:Worlds: A world is a self-contained package for a specific adventure or campaign. It includes all the necessary scenes, actors, items, and journal entries for that adventure and is tied to a specific game system.Systems: A game system provides the ruleset for a specific tabletop role-playing game (e.g., Dungeons & Dragons 5th Edition, Pathfinder 2e). It defines the data models for actors and items, character sheets, and the core mechanics of the game.Modules: Modules are add-ons that extend or modify the functionality of FoundryVTT, a game system, or both. They can add new features, change the user interface, or provide new content. This guide focuses on the development of modules.Standard Module StructureA well-structured module is easier to maintain and for others to understand. Here is a recommended directory structure:your-module-name/
├── module.json # The manifest file (required)
├── scripts/
│ └── main.js # Your module's JavaScript code
├── styles/
│ └── main.css # Your module's CSS for styling
├── templates/
│ └── my-template.hbs # Handlebars templates for new UI elements
├── lang/
│ └── en.json # Language localization file
└── packs/
└── my-compendium.db # Compendium packs with content

2. The module.json Manifest: The Heart of Your ModuleThe module.json file is a manifest that tells FoundryVTT everything it needs to know about your module. It's a JSON file that must be at the root of your module's directory.Required Manifest Fieldsid: A unique, lowercase identifier for your module (e.g., "my-awesome-module"). This must match the name of your module's folder.title: The human-readable name of your module that will be displayed in the FoundryVTT interface.description: A brief description of what your module does.version: The version number of your module. It's recommended to use semantic versioning (e.g., "1.0.0").compatibility: An object specifying the versions of FoundryVTT your module is compatible with.minimum: The minimum version of FoundryVTT required.verified: The version of FoundryVTT you have personally tested the module with.Important Optional Fieldsesmodules: An array of paths to your JavaScript files that should be loaded as ES modules. This is the modern and recommended way to include your module's logic.styles: An array of paths to your CSS files.packs: An array of objects defining any compendium packs included with your module.dependencies: An array of objects specifying other modules or systems that your module depends on.languages: An array of objects defining the language files for localization.Example module.json{
   "id": "my-awesome-module",
   "title": "My Awesome Module",
   "description": "A module that does awesome things.",
   "version": "1.0.0",
   "compatibility": {
   "minimum": "10",
   "verified": "11"
   },
   "authors": [
   {
   "name": "AI Developer"
   }
   ],
   "esmodules": [
   "scripts/main.js"
   ],
   "styles": [
   "styles/main.css"
   ],
   "languages": [
   {
   "lang": "en",
   "name": "English",
   "path": "lang/en.json"
   }
   ]
   }
3. Key Integration Points: Making Your Module Do ThingsFoundryVTT provides several ways for your module to interact with the core software and other packages.The Hooks System: Your Primary Integration PointThe Hooks system is an event-driven framework that allows your module to execute code at specific points in the FoundryVTT lifecycle. This is the most important integration point to understand.You can register a function to be called for a specific hook using Hooks.on() or Hooks.once().Essential Hooks to Knowinit: This hook is fired when FoundryVTT is first initializing. It's the best place to register settings, and set up your module's initial configuration.setup: Fired after the init hook. This is where you should set up anything that depends on systems or other modules being initialized.ready: This hook is fired when the entire FoundryVTT application is ready and the game world is loaded. It's the place to perform actions that require the game world to be fully active.render<Application>: This is a dynamic hook that fires whenever an application window is rendered (e.g., renderActorSheet, renderJournalSheet). It's useful for modifying the HTML of an application before it's displayed.preCreate<Document> and create<Document>: These hooks (e.g., preCreateActor, createChatMessage) allow you to intercept and modify or react to the creation of documents in the game world.Example: Using a Hook// scripts/main.js

Hooks.on('init', () => {
console.log('My Awesome Module | Initializing');

// Register a module setting
game.settings.register('my-awesome-module', 'my-setting', {
name: 'My Awesome Setting',
hint: 'A description of my setting.',
scope: 'world', // 'world' or 'client'
config: true, // Show this in the module settings
type: String,
default: 'Default Value'
});
});

Hooks.on('ready', () => {
console.log('My Awesome Module | Ready');
// Access the setting you registered
const mySetting = game.settings.get('my-awesome-module', 'my-setting');
console.log(`My Awesome Module | The setting value is: ${mySetting}`);
});
The FoundryVTT API: Interacting with Game DataFoundryVTT provides a rich client-side API for interacting with game data. The global game object is your entry point to this API.Key API Objectsgame.actors: A collection of all the actors in the world.game.items: A collection of all the items in the world.game.scenes: A collection of all the scenes in the world.game.user: The current user.game.settings: The API for managing module settings.ui.notifications: An API for displaying notifications to the user.Documents and the Data ModelEverything in FoundryVTT, from actors to items to chat messages, is a Document. Understanding the Document data model is key to manipulating game data. You can create, read, update, and delete documents using the API.4. Best Practices for AI-Powered DevelopmentTo ensure your modules are high-quality and play well with others, follow these best practices:Scoped CSS: Always prefix your CSS rules with a unique class or ID for your module to avoid unintentionally styling other parts of the FoundryVTT interface.Localization: Never hardcode text that will be displayed to the user. Use the localization API (game.i18n.localize()) and provide language files.Check for Compatibility: Before using functionality from another module or a specific system, check if it's active.Clean Console: Avoid leaving console.log statements in your final code. Use them for debugging, but remove them for release.Use Libraries Wisely: If you include external libraries, be aware that they can conflict with other modules. If possible, use FoundryVTT's built-in libraries.Idempotency: Write your code in a way that it can be run multiple times without causing issues. This is especially important for hooks that may be called multiple times.Clear and Commented Code: Write code that is easy for humans to understand. Add comments to explain complex logic.By following this guide, you will be well-equipped to develop powerful and innovative modules that enhance the Foundry Virtual Tabletop experience for users around the world.
