import { Application, Text, Assets, Sprite, Container,FillGradient,Graphics } from "pixi.js";

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
    const sprites = new Container();



    const radialGradient = new FillGradient({
        type: 'radial',
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0.2,
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
            { offset: 0, color: 0x393838 },
            { offset: 1, color: 0x252525 },
        ],
    });

    const obj = new Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(radialGradient );

    app.stage.addChild(obj);

    app.stage.addChild(sprites); 
    
    const gameManager = new GameManager(app);

    const statsText = new Text({
        text: '',
        style: {
            fill: '#ffffff',
            fontSize: 36,
            fontFamily: 'MyFont',
        }
    });
    statsText.x = app.renderer.width / 2;
    statsText.y = 50;
    statsText.anchor.set(0.5);
   
    gameManager.statsText = statsText;

    await gameManager.switchToLobby();

    sprites.addChild(statsText);
   
    sprites.addChild(gameManager.chacacterContainer);
    sprites.addChild(gameManager.pickingContainer);
    sprites.addChild(gameManager.mainContainer);
    sprites.addChild(gameManager.elseTurnContainer);
    sprites.addChild(gameManager.lobbyContainer);
    
})();
