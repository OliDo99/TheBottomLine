import { Application } from "pixi.js";
import GameManager from "./models/GameManager.js";
import GameState from "./models/GameState.js";
import UIManager from "./models/UIManager.js";
import NetworkManager from "./models/NetworkManager.js";

(async () => {
    const app = new Application();
    await app.init({
        resizeTo: window,
        autoDensity: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
    });

    app.canvas.style.position = "absolute";
    document.body.appendChild(app.canvas);

    const gameState = new GameState();
    const uiManager = new UIManager(app);
    const networkManager = new NetworkManager('ws://localhost:3000/websocket');
    const gameManager = new GameManager(gameState, uiManager, networkManager);

    networkManager.setGameManager(gameManager);

    gameManager.initLobby();
})();
