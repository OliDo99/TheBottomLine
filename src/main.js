import { Application, Text, Assets, Sprite,Container  } from "pixi.js";
import AssetCards from "./models/AssetCards.js";
import LiablityCards from "./models/LiablityCards.js";
import GameManager from "./models/GameManager.js";

(async () => {
    const app = new Application( );
    await app.init({ resizeTo: window, backgroundAlpha: 0.5});
    
    app.canvas.style.position = "absolute";

    document.body.appendChild(app.canvas);
    const sprites = new Container();

    app.stage.addChild(sprites);

    const assetDeck = new AssetCards();
    const liabilityDeck = new LiablityCards();

    const assetDeckSprite = await assetDeck.initializeDeckSprite();
    const liabilityDeckSprite = await liabilityDeck.initializeDeckSprite();

    //temp pos
    assetDeck.setDeckPosition(window.innerWidth/2+100, window.innerHeight/2);
    liabilityDeck.setDeckPosition(window.innerWidth/2-100, window.innerHeight/2);;

    const gameManager = new GameManager(app);
    
    // Add end turn button  
    const buttonTex = await Assets.load("./images/next.png");
    const rect = new Sprite(buttonTex);
    rect.eventMode = 'static';
    rect.on('pointerdown', () => { gameManager.nextTurn(); });
    rect.x = window.innerWidth - 100;
    rect.y = 100;
    rect.anchor.set(0.5);
    rect.width = 80;
    rect.height = 80;
    sprites.addChild(rect);
  

    // Modify deck click handlers to use current player
    assetDeckSprite.on('mousedown', async () => {
        const currentPlayer = gameManager.getCurrentPlayer();
        if (currentPlayer.tempHand.length < currentPlayer.maxTempCards) {
            const card = assetDeck.getRandomCard();
            await card.initializeSprite();
            
            card.sprite.on('cardPlayed', () => {
                const cardIndex = currentPlayer.hand.indexOf(card);
                if (cardIndex !== -1) {
                    const wasPlayed = currentPlayer.playAsset(cardIndex);
                    if (wasPlayed) {
                        sprites.removeChild(card.sprite);
                    }
                    gameManager.updateUI();
                }
            });

            card.sprite.on('cardDiscarded', (discardedCard) => {
                const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
                if (cardIndex !== -1) {
                    sprites.removeChild(discardedCard.sprite);
                    currentPlayer.tempHand.splice(cardIndex, 1);
                    
                    currentPlayer.tempHand.forEach(remainingCard => {
                        currentPlayer.addCardToHand(remainingCard);
                    });
                    
                    currentPlayer.tempHand = [];
                    currentPlayer.positionCardsInHand();
                }
            });
            currentPlayer.addCardToTempHand(card);
            sprites.addChild(card.sprite);
            currentPlayer.positionTempCards();       
            
        }
    });

    liabilityDeckSprite.on('mousedown', async () => {
        const currentPlayer = gameManager.getCurrentPlayer();
        if (currentPlayer.tempHand.length < currentPlayer.maxTempCards) {
            const card = liabilityDeck.getRandomCard();
            await card.initializeSprite();
            
            card.sprite.on('cardPlayed', () => {
                const cardIndex = currentPlayer.hand.indexOf(card);
                if (cardIndex !== -1) {
                    currentPlayer.playLiability(cardIndex);
                    sprites.removeChild(card.sprite); // Remove sprite when played
                    gameManager.updateUI();
                }
            });

            card.sprite.on('cardDiscarded', (discardedCard) => {
                const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
                if (cardIndex !== -1) {
                    sprites.removeChild(discardedCard.sprite);
                    currentPlayer.tempHand.splice(cardIndex, 1);                    
                    
                    currentPlayer.tempHand.forEach(remainingCard => {
                        currentPlayer.addCardToHand(remainingCard);
                    });                    
                   
                    currentPlayer.tempHand = [];
                    currentPlayer.positionCardsInHand();
                }
            });
            
            currentPlayer.addCardToTempHand(card);
            sprites.addChild(card.sprite);
            currentPlayer.positionTempCards();
        }
    });

    sprites.addChild(assetDeckSprite);
    sprites.addChild(liabilityDeckSprite);

    // Initialize starting hands for all players
    for (const player of gameManager.players) {
        for (let i = 0; i < 2; i++) {
            const asset = assetDeck.getRandomCard();
            const liability = liabilityDeck.getRandomCard();
            
            await asset.initializeSprite();
            await liability.initializeSprite();
            
            // Add event listeners for card played events
            asset.sprite.on('cardPlayed', () => {
                const cardIndex = player.hand.indexOf(asset);
                if (cardIndex !== -1) {
                    const wasPlayed = player.playAsset(cardIndex);
                    if (wasPlayed) {
                        sprites.removeChild(asset.sprite);
                    }
                    gameManager.updateUI();
                }
            });

            liability.sprite.on('cardPlayed', () => {
                const cardIndex = player.hand.indexOf(liability);
                if (cardIndex !== -1) {
                    player.playLiability(cardIndex);
                    sprites.removeChild(liability.sprite); // Remove sprite when played
                    gameManager.updateUI();
                }
            });
            
            player.addCardToHand(asset);
            player.addCardToHand(liability);
            
            sprites.addChild(asset.sprite);
            sprites.addChild(liability.sprite);
        }
        player.positionCardsInHand();
    }

    // Create stats display
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

    // Initial UI update
    gameManager.updateUI();
})();