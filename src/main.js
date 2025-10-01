import { Application, Text, Assets, Sprite, Container,Graphics } from "pixi.js";
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
    const currentPlayer = gameManager.getCurrentPlayer();


    // Add end turn button
    /*
   const rect = new Graphics();
    rect.fill(0x0000FF);
    rect.roundRect( 100,window.innerHeight/2, 140, 220, 10);
    
    rect.fill();
    sprites.addChild(rect);
    */
    const buttonTex = await Assets.load("./miscellaneous/next.png");
    const nextButton = new Sprite(buttonTex);
    nextButton.eventMode = 'static';
    nextButton.on('pointerdown', () => { 
        if (gameManager.currentPhase === 'picking') {
            if (currentPlayer.tempHand.length > 0) {
                currentPlayer.tempHand.forEach(card => {
                    currentPlayer.addCardToHand(card);
                    if (card.discardButton) {
                        sprites.removeChild(card.discardButton);
                    }
                });
                currentPlayer.tempHand = [];
                currentPlayer.positionCardsInHand();
                gameManager.switchToMainPhase();
            }
        } else {
            gameManager.nextTurn();
        }
    });
    nextButton.x = window.innerWidth - 100;
    nextButton.y = 100;
    nextButton.anchor.set(0.5);
    nextButton.width = 80;
    nextButton.height = 80;
    gameManager.mainContainer.addChild(nextButton);

   const assetDeckSprite = await gameManager.CreateAssetDeck();
   const liabilityDeckSprite = await gameManager.CreateLiabilityDeck();


    

    gameManager.pickingContainer.addChild(assetDeckSprite);
    gameManager.pickingContainer.addChild(liabilityDeckSprite);

    gameManager.switchToPickingPhase();

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
    sprites.addChild(statsText);
    gameManager.statsText = statsText;

    sprites.addChild(statsText);
    sprites.addChild(gameManager.pickingContainer);
    sprites.addChild(gameManager.mainContainer);
    
    gameManager.updateUI();
})();
