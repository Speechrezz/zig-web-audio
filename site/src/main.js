import { App } from "./app/app.js";

/** @type {App | null} */
let app = null;

export async function initialize() {
    if (app) return app;

    app = new App();
    await app.initialize();
    return app;
}

initialize().catch((error) => {
    console.error("Failed to initialize app:", error);
});