import { Text, Container,Graphics,Assets, Sprite} from "pixi.js";
import Player from './Player.js';
import AssetCards from "./AssetCards.js";
import LiablityCards from "./LiablityCards.js"
import { getAllCharacters } from './Characters.js';

class GameManager {

    constructor(app) {
        this.app = app;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.numPlayers = 4;
        this.charakters = getAllCharacters();
        this.initializePlayers();
        this.currentPhase = 'picking'; 
        this.mainContainer = new Container();
        this.pickingContainer = new Container();
        this.chacacterContainer = new Container();
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
    async startGame(){
        await this.GrabCharacters();
        await this.CreateAssetDeck();
        await this.CreateLiabilityDeck();
        await this.nextButton();
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.charakter.usePassive(currentPlayer);
        currentPlayer.reveal = true;
        this.switchToCharacterPhase(); 


        }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    switchToPickingPhase() {
        this.currentPhase = 'picking';
        this.mainContainer.visible = false;
        this.pickingContainer.visible = true;
        this.chacacterContainer.visible  = false;
        this.updateUI();
        
    }

    switchToMainPhase() {
        this.currentPhase = 'main';
        this.mainContainer.visible = true;
        this.pickingContainer.visible = false;
        this.chacacterContainer.visible  = false;
        this.updateUI();
    }
    switchToCharacterPhase() {
        this.currentPhase = 'character';
        this.mainContainer.visible = false;
        this.pickingContainer.visible = false;
        this.chacacterContainer.visible  = true;
        this.updateUI();
    }
    nextTurn() {
        
        const sortedPlayers = [...this.players].sort((a, b) => a.charakter.order - b.charakter.order);
        const lastPlayer = this.players[this.currentPlayerIndex];
        const lastPlayerSortedIndex = lastPlayer ? sortedPlayers.indexOf(lastPlayer) : -1;

        const nextPlayerSortedIndex = (lastPlayerSortedIndex + 1) % sortedPlayers.length;
        const nextPlayer = sortedPlayers[nextPlayerSortedIndex];
        this.currentPlayerIndex = this.players.indexOf(nextPlayer);

        const currentPlayer = this.players[this.currentPlayerIndex];

        currentPlayer.playableAssets = 1;
        currentPlayer.playableLiabilities = 1;
        currentPlayer.reveal = true;
        currentPlayer.tempHand = []; 
        currentPlayer.charakter.usePassive(currentPlayer);
        this.switchToPickingPhase();        
    }

    updateUI() {
        this.showAssetData();
        this.showCharacterData();
        const currentPlayer = this.getCurrentPlayer();
        
        if (this.currentPhase === 'picking') {
            this.statsText.text = `${currentPlayer.charakter.name} is picking cards`;
        } else if(this.currentPhase == "main"){
            this.statsText.text = `${currentPlayer.charakter.name} is playing | ${currentPlayer.cash}`;
        }
        else if(this.currentPhase == "character"){
            this.statsText.text = `Chose a character`;
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
        this.pickingContainer.addChild(assetDeckSprite);
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
        this.pickingContainer.addChild(liabilityDeckSprite);
        return liabilityDeckSprite;
    }
    
    async showAssetData()
    {
        this.players.forEach(async player => {
            let texture;
            if(player.reveal){
                texture = await Assets.load(player.charakter.iconPath);
            }
            else{
                texture = await Assets.load("./miscellaneous/discard.png")
            }
            
            let characterIcon = new Sprite(texture);
            let x = 30 + this.players.indexOf(player)*60;   
            characterIcon.x = x;
            characterIcon.y = 30;
            characterIcon.width = 50;
            characterIcon.height = 55.7;
            characterIcon.anchor.set(0.5);
            this.mainContainer.addChild(characterIcon);

            
            player.assetList.forEach(card => {
                const rect2 = new Graphics();
                rect2.fill(card.color);

                
                let y = 60 + player.assetList.indexOf(card)*30;
                rect2.roundRect(x-20, y , 20, 20, 50);
                rect2.fill();
                
                this.mainContainer.addChild(rect2);
            });
        }); 
    }
    async showCharacterData()
    {
        this.players.forEach(async player => {
            let texture;
            if(player.reveal){
                texture = await Assets.load(player.charakter.texturePath);
            }
            else{
                texture = await Assets.load("./miscellaneous/character_back.webp")
            }
            
            let characterCard = new Sprite(texture);
            let y = 50 + this.players.indexOf(player)*100;   
            characterCard.x = window.innerWidth-100;
            characterCard.y = y;
            characterCard.scale.set(0.15);
            characterCard.anchor.set(0.5);
            characterCard.rotation = 90 * Math.PI / 180
            this.mainContainer.addChild(characterCard);
        }); 
    }
    async nextButton(){
        const currentPlayer = this.getCurrentPlayer();

        const buttonTex = await Assets.load("./miscellaneous/next.png");
        const nextButton = new Sprite(buttonTex);
        nextButton.eventMode = 'static';
        nextButton.on('pointerdown', () => { 
            if (this.currentPhase === 'picking') {
                if (currentPlayer.tempHand.length > 0) {
                    currentPlayer.tempHand.forEach(card => {
                        currentPlayer.addCardToHand(card);
                        if (card.discardButton) {
                            sprites.removeChild(card.discardButton);
                        }
                    });
                    currentPlayer.tempHand = [];
                    currentPlayer.positionCardsInHand();
                    this.switchToMainPhase();
                }
            } else {
                this.nextTurn();
            }
        });
        nextButton.x = window.innerWidth - 100;
        nextButton.y = window.innerHeight -100;
        nextButton.anchor.set(0.5);
        nextButton.width = 80;
        nextButton.height = 80;
        
        this.mainContainer.addChild(nextButton);
    }
    async GrabCharacters(){
        this.charakters.forEach(async character =>{
            let texture = await Assets.load(character.texturePath);
            let sprite = new Sprite(texture);
            sprite.scale.set(0.3);
            sprite.anchor.set(0.5)
           
            sprite.position.x =  this.charakters.indexOf(character)*190 +110; 
            sprite.position.y = window.innerHeight/2;

            this.chacacterContainer.addChild(sprite);
            console.log(character.name);

        });
    }
}

export default GameManager;