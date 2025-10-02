import { Application, Text, Assets, Sprite, Container } from "pixi.js";
import GameManager from "./models/GameManager.js";

(async () => {
    const app = new Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x4A4A4A,
        autoDensity: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1, 
    });
    app.canvas.style.position = "absolute";

    document.body.appendChild(app.canvas);
    const sprites = new Container();

    app.stage.addChild(sprites);

   

    const gameManager = new GameManager(app);
    
    await gameManager.startGame();    

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

   
    sprites.addChild(statsText);
    
    sprites.addChild(gameManager.chacacterContainer);
    sprites.addChild(gameManager.pickingContainer);
    sprites.addChild(gameManager.mainContainer);
    
    
    gameManager.updateUI();
})();


