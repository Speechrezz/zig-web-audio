import { App } from "./app/app.js";

const app = new App();

export async function initialize() {
    await app.initialize();
}