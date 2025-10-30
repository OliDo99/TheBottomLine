import { Application, Text, Container,Graphics } from "pixi.js";

import GameManager from "./models/GameManager.js";


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

    const gameManager = new GameManager(app);
    const sprites = new Container();
    const backGroundGradient = new Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(gameManager.getGradient());
    const statsText = new Text({
        text: '',
        style: {
            fill: '#ffffff',
            fontSize: 36,
            fontFamily: 'MyFont',
        }
    });
    statsText.anchor.set(0.5);
    statsText.position.set(window.innerWidth / 2, 30);
    
    app.stage.addChild(backGroundGradient);
    app.stage.addChild(sprites);

    sprites.addChild(gameManager.chacacterContainer);
    sprites.addChild(gameManager.pickingContainer);
    sprites.addChild(gameManager.mainContainer);
    sprites.addChild(gameManager.elseTurnContainer);
    sprites.addChild(gameManager.lobbyContainer);
    
    gameManager.statsText = statsText;
    sprites.addChild(statsText);

    await gameManager.initLobby();
    
})();
