import { Text, Container  } from "pixi.js";
import Player from './Player.js';
import AssetCards from "./AssetCards.js";
import LiablityCards from "./LiablityCards.js"
import { getAllCharacters } from './Characters.js';
class GameManager {
    
    constructor(app) {
        this.app = app;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.numPlayers = 7;
        this.charakters = getAllCharacters();
        this.initializePlayers();
        this.currentPhase = 'picking'; // 'picking' or 'main'
        this.mainContainer = new Container();
        this.pickingContainer = new Container();
        this.statsText = new Text({
        text: '',
        style: {
            fill: '#ffffff',
            fontSize: 36,
            fontFamily: 'MyFont',
        }
    });
    }

    initializePlayers() {
        for (let i = 0; i < this.numPlayers; i++) {
            const player = new Player();
            player.charakter = this.charakters[i];
            player.cash = 1; 
            this.players.push(player);
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    switchToPickingPhase() {
        this.currentPhase = 'picking';
        this.mainContainer.visible = false;
        this.pickingContainer.visible = true;
        this.updateUI();
    }

    switchToMainPhase() {
        this.currentPhase = 'main';
        this.mainContainer.visible = true;
        this.pickingContainer.visible = false;
        this.updateUI();
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numPlayers;
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.playableAssets = 1;
        currentPlayer.playableLiabilities = 1;
        currentPlayer.charakter.usePassive(currentPlayer);
        currentPlayer.tempHand = []; 
        this.switchToPickingPhase(); 
    }

    updateUI() {
        const currentPlayer = this.getCurrentPlayer();
        
        
        if (this.currentPhase === 'picking') {
            this.statsText.text = `Pick your cards`;
        } else {
            this.statsText.text = `Playable Assets: ${currentPlayer.playableAssets} | Playable Liabilities: ${currentPlayer.playableLiabilities} | Character: ${currentPlayer.charakter.name}`;
        }

        
        this.players.forEach(player => {
            player.hand.forEach(card => {
                card.sprite.visible = false;
            });
            player.assetList.forEach(card => {
                card.sprite.visible = false;
            });
            player.liabilityList.forEach(card => {
                card.sprite.visible = false;
            });
        });

        
        currentPlayer.hand.forEach(card => {
            card.sprite.visible = true;
        });
        currentPlayer.assetList.forEach(card => {
            card.sprite.visible = true;
        });
        currentPlayer.liabilityList.forEach(card => {
            card.sprite.visible = true;
        });
    }
    async CreateAssetDeck() {
        const assetDeck = new AssetCards();

        const assetDeckSprite = await assetDeck.initializeDeckSprite();

        assetDeck.setDeckPosition(window.innerWidth/2-150, window.innerHeight-50);

        assetDeckSprite.on('mousedown', async () => {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.tempHand.length < currentPlayer.maxTempCards) {
            const card = assetDeck.getRandomCard();

            await card.initializeSprite();
            
            card.sprite.on('cardPlayed', () => {
                const cardIndex = currentPlayer.hand.indexOf(card);
                if (cardIndex !== -1) {
                    if (currentPlayer.playAsset(cardIndex)) {
                        this.mainContainer.removeChild(card.sprite);
                        this.mainContainer.addChild(card.sprite);
                    }
                    this.updateUI();
                }
            });

            card.sprite.on('cardDiscarded', (discardedCard) => {
                const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
                if (cardIndex !== -1) {
                    this.pickingContainer.removeChild(discardedCard.sprite);
                    this.pickingContainer.removeChild(discardedCard.discardButton);
                    currentPlayer.tempHand.splice(cardIndex, 1);

                    if(currentPlayer.tempHand.length == currentPlayer.maxKeepCards){
                        currentPlayer.tempHand.forEach(remainingCard => {
                        currentPlayer.addCardToHand(remainingCard);
                        this.mainContainer.addChild(remainingCard.sprite);
                        this.pickingContainer.removeChild(remainingCard.discardButton);
                        currentPlayer.tempHand = [];
                        this.switchToMainPhase();
                    });
                    }
                    
                    currentPlayer.positionCardsInHand();
                }
            });
            currentPlayer.addCardToTempHand(card);
            this.pickingContainer.addChild(card.sprite)
            if (card.discardButton) {
                this.pickingContainer.addChild(card.discardButton);
            }
            currentPlayer.positionTempCards();
        }
        });
        return assetDeckSprite;
    }

    async CreateLiabilityDeck() {
        const liabilityDeck = new LiablityCards();
    
        const liabilityDeckSprite = await liabilityDeck.initializeDeckSprite();   
    
        liabilityDeck.setDeckPosition(window.innerWidth/2+150, window.innerHeight-50);

        liabilityDeckSprite.on('mousedown', async () => {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.tempHand.length < currentPlayer.maxTempCards) {
            const card = liabilityDeck.getRandomCard();
            await card.initializeSprite();

            card.sprite.on('cardPlayed', () => {
                const cardIndex = currentPlayer.hand.indexOf(card);
                if (cardIndex !== -1) {
                    if(currentPlayer.playLiability(cardIndex)){
                        this.mainContainer.removeChild(card.sprite);
                        this.mainContainer.addChild(card.sprite)
                    }
                    this.updateUI();
                }
            });

            card.sprite.on('cardDiscarded', (discardedCard) => {
                const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
                if (cardIndex !== -1) {
                    this.pickingContainer.removeChild(discardedCard.sprite);
                    this.pickingContainer.removeChild(discardedCard.discardButton);
                    currentPlayer.tempHand.splice(cardIndex, 1);
                    
                    if(currentPlayer.tempHand.length == currentPlayer.maxKeepCards){

                        currentPlayer.tempHand.forEach(remainingCard => {
                            currentPlayer.addCardToHand(remainingCard);
                            this.mainContainer.addChild(remainingCard.sprite);
                            this.pickingContainer.removeChild(remainingCard.discardButton);
                            currentPlayer.tempHand = [];
                            this.switchToMainPhase();
                        });
                    }
                    currentPlayer.positionCardsInHand();
                   
                }
            });

            currentPlayer.addCardToTempHand(card);
            this.pickingContainer.addChild(card.sprite);
            if (card.discardButton) {
                this.pickingContainer.addChild(card.discardButton);
            }
            currentPlayer.positionTempCards();
        }
        });
        return liabilityDeckSprite;
    }
    

}

export default GameManager;