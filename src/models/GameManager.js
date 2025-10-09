import { Text, Container,Graphics,Assets, Sprite} from "pixi.js";
import { Input,Button } from '@pixi/ui';
import Player from './Player.js';
import AssetCards from "./AssetCards.js";
import LiablityCards from "./LiablityCards.js"
import Asset from './Asset.js';
import Liability from './Liablity.js';
import { getAllCharacters } from './Characters.js';
import NetworkManager from "./NetworkManager.js";

class GameManager {

    constructor(app) {
        
        this.app = app;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.numPlayers = 4;
        this.myName = 1;
        this.characters = getAllCharacters();

        this.characterSprites = [];
        this.characterSpriteMap = new Map();
        this.shuffledCharacters = [];
        this.faceUpCards = [];
        this.faceDownCards = [];
        this.characterDraftingPlayerIndex = 0;
        this.currentDraftChoices = [];

        this.initializePlayers();
        this.currentPhase = 'picking'; 
        this.lobbyContainer = new Container();
        this.mainContainer = new Container();
        this.pickingContainer = new Container();
        this.chacacterContainer = new Container();
        this.elseTurnContainer = new Container();
        this.draftOverlay = new Graphics();
        this.statsText = new Text({
        text: '',
        style: {
            fill: '#ffffff',
            fontSize: 36,   
            fontFamily: 'MyFont',
        }});
        this.networkManager = new NetworkManager('ws://localhost:3000/websocket', this);
    }

    initializePlayers() {
        for (let i = 0; i < this.numPlayers; i++) {
            const player = new Player(i+1);
            player.cash = 1; 
            this.players.push(player);
        }
    }
    async startGame(){
        await this.GrabCharacters(); 
        await this.CreateAssetDeck();
        await this.CreateLiabilityDeck();
        await this.nextButton(this.mainContainer);
        await this.GiveStartHand();
        
        
        this.newRound();
    }
    

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    switchToLobby(){
        
        this.lobbyContainer.visible = true;
        this.chacacterContainer.visible  = false;
        this.mainContainer.visible = false;
        this.elseTurnContainer.visible = false;
        
        const myInput = new Input({
            bg: new Graphics().roundRect(0, 0, 200, 40, 5).fill(0x333333),
            padding: [10, 10, 10, 10],
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold'
            },
            placeholder:"Enter Name",
            
          
        });
        myInput.onEnter.connect(val => {
            console.log(val)
            this.networkManager.sendMessage(`{"username":"${val}","channel":"test"}`)
            this.myName = val;

        });
        myInput.position.set(window.innerWidth/2-100, window.innerHeight/2-20);
        

        const button = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)
                .fill(0xFFFFFF)
        );

        button.onPress.connect(() =>  this.networkManager.sendMessage(`{"action":"StartGame"}`));

        this.lobbyContainer.addChild(button.view);


        this.lobbyContainer.addChild(myInput);
    }
    switchToPickingPhase() {
        let player = this.getCurrentPlayer();
        this.chacacterContainer.visible  = false;
        this.mainContainer.visible = false;
        this.lobbyContainer.visible = false;
        this.currentPhase = 'picking'; 
        if (player.name == this.myName){
            this.pickingContainer.visible = true;
            this.elseTurnContainer.visible = false;
             this.showAssetData(this.mainContainer);
            this.showCharacterData(this.mainContainer);
        }
        else{
            this.otherCards();
            this.elseTurnContainer.visible = true;
            this.pickingContainer.visible = false;
            this.showAssetData(this.elseTurnContainer);
            this.showCharacterData(this.elseTurnContainer);
        }
        this.updateUI();
        
    }
    
    switchToMainPhase() {
        this.currentPhase = 'main';
        this.lobbyContainer.visible = false;
        this.mainContainer.visible = true;
        this.pickingContainer.visible = false;
        this.chacacterContainer.visible  = false;
        this.elseTurnContainer.visible = false;
        this.updateUI();
    }
    switchToCharacterPhase() {
        this.currentPhase = 'character';
        this.lobbyContainer.visible = false;
        this.chacacterContainer.visible = true;
        this.mainContainer.visible = false;
        this.pickingContainer.visible = false;
        this.elseTurnContainer.visible = false;
        
        
        this.characterChoosingPlayerIndex = 0;
        this.availableCharacters = [...this.characters];

        
        this.characterSprites.forEach(sprite => {
            sprite.eventMode = 'static';
            sprite.alpha = 1.0;
        });

        this.statsText.text = `Player ${this.characterChoosingPlayerIndex + 1}, choose your character!`;
        this.updateUI();
    }
    nextTurn() {
        
        const sortedPlayers = [...this.players].sort((a, b) => a.character.order - b.character.order);
        const lastPlayer = this.players[this.currentPlayerIndex];
        const lastPlayerSortedIndex = lastPlayer ? sortedPlayers.indexOf(lastPlayer) : -1;
        if (this.currentPlayerIndex == this.players.length -1) {
            this.newRound();
            return;
        }

        const nextPlayerSortedIndex = (lastPlayerSortedIndex + 1) % sortedPlayers.length;
        const nextPlayer = sortedPlayers[nextPlayerSortedIndex];
        this.currentPlayerIndex = this.players.indexOf(nextPlayer);

        const currentPlayer = this.players[this.currentPlayerIndex];

        currentPlayer.playableAssets = 1;
        currentPlayer.playableLiabilities = 1;
        currentPlayer.reveal = true;
        currentPlayer.tempHand = []; 
        currentPlayer.character.usePassive(currentPlayer);
        this.switchToPickingPhase();        
    }
    newRound() {
        this.currentPhase = 'character';
        this.chacacterContainer.visible = true;
        this.mainContainer.visible = false;
        this.pickingContainer.visible = false;
        this.elseTurnContainer.visible = false;
        
       
        this.draftOverlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0x000000, alpha: 0.7 });
        this.chacacterContainer.addChildAt(this.draftOverlay, 0);
        this.draftOverlay.visible = true;

        this.players.forEach(p => {
            p.character = null;
            p.reveal = false;
        });

        this.setupCharacterDraft();
    }
    updateUI() {
        const currentPlayer = this.getCurrentPlayer();
        
        if (this.currentPhase == 'picking') {
            this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character.name} is picking cards`;
        } else if(this.currentPhase == "main"){
            this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character.name} is playing | ${currentPlayer.cash}`;
        } else if(this.currentPhase == "character"){
            this.statsText.text = `${currentPlayer.name} Chose a character`;
        }
        
        this.players.forEach(player => {
            player.hand.forEach(card => {
                if (card.sprite) card.sprite.visible = false;
            });
            player.assetList.forEach(card => {
                if (card.sprite) card.sprite.visible = false;
            });
            player.liabilityList.forEach(card => {
                if (card.sprite) card.sprite.visible = false;
            });
        });

        currentPlayer.hand.forEach(card => {
            if (card.sprite) card.sprite.visible = true;
        });
        currentPlayer.assetList.forEach(card => {
            if (card.sprite) card.sprite.visible = true;
        });
        currentPlayer.liabilityList.forEach(card => {
            if (card.sprite) card.sprite.visible = true;
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
    
    showAssetData(container)
    {
        this.players.forEach(async player => {
         
            let texture;
            if(player.reveal){
                texture = await Assets.load(player.character.iconPath);
            }
            else{
                texture = await Assets.load("./miscellaneous/noneCharacter.png") // HERE
            }
            
            let characterIcon = new Sprite(texture);
            let x = 30 + this.players.indexOf(player)*60;   
            characterIcon.x = x;
            characterIcon.y = 30;
            characterIcon.width = 50;
            characterIcon.height = 55.7;
            characterIcon.anchor.set(0.5);
            container.addChild(characterIcon);

            
            player.assetList.forEach(card => {
                const rect2 = new Graphics();
                rect2.fill(card.color);

                
                let y = 60 + player.assetList.indexOf(card)*30;
                rect2.roundRect(x-20, y , 20, 20, 50);
                rect2.fill();
                
                container.addChild(rect2);
            });
        }); 
    }
    showCharacterData(container)
    {
        this.players.forEach(async player => {
            let texture;
            if(player.reveal){
                texture = await Assets.load(player.character.texturePath);
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
            container.addChild(characterCard);
        }); 
    }
    async nextButton(container){
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
                           
                            this.pickingContainer.removeChild(card.discardButton);
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
        
        container.addChild(nextButton);
    }
    async GrabCharacters(){
        for (const character of this.characters) {
            let texture = await Assets.load(character.texturePath);
            let sprite = new Sprite(texture);
            sprite.scale.set(0.3);
            sprite.anchor.set(0.5);
            
            sprite.visible = false; 
            
    
            sprite.on('pointerdown', () => this.handleCharacterDraftPick(character));

            this.chacacterContainer.addChild(sprite);
            this.characterSprites.push(sprite);
            this.characterSpriteMap.set(character, sprite);
        }
    }
    setupCharacterDraft() {
        this.shuffledCharacters = [...this.characters].sort(() => 0.5 - Math.random());
        this.faceUpCards = [];
        this.faceDownCards = [];

        let numFaceUp = 0;
        if (this.numPlayers === 4) numFaceUp = 2;
        else if (this.numPlayers === 5) numFaceUp = 1;

        for (let i = 0; i < numFaceUp; i++) {
            this.faceUpCards.push(this.shuffledCharacters.pop());
        }
        
        const faceUpSpacing = 190;
        const faceUpStartX = (this.app.screen.width - (this.faceUpCards.length - 1) * faceUpSpacing) / 2;
        this.faceUpCards.forEach((card, i) => {
            const sprite = this.characterSpriteMap.get(card);
            if (sprite) {
                sprite.position.set(faceUpStartX + i * faceUpSpacing, 180);
                sprite.visible = true;
                sprite.alpha = 0.6;
                sprite.eventMode = 'none';
            }
        });

        this.faceDownCards = [...this.shuffledCharacters];
        this.characterDraftingPlayerIndex = 0;
        this.presentCharacterDraftChoice();
    }
    presentCharacterDraftChoice() {
        this.characterSpriteMap.forEach(sprite => sprite.visible = false);
        this.faceUpCards.forEach(card => {
            const sprite = this.characterSpriteMap.get(card);
            if(sprite) sprite.visible = true;
        });

        const currentPlayerIndex = this.characterDraftingPlayerIndex;
        this.currentDraftChoices = [...this.faceDownCards];
        this.statsText.text = `Player ${currentPlayerIndex + 1}, choose!`;
        
        const spacing = 190;
        const startX = (this.app.screen.width - (this.currentDraftChoices.length - 1) * spacing) / 2;
        
        this.currentDraftChoices.forEach((card, i) => {
            const sprite = this.characterSpriteMap.get(card);
            if (sprite) {
                sprite.position.set(startX + i * spacing, this.app.screen.height / 2 + 100);
                sprite.visible = true;
                sprite.eventMode = 'static';
                sprite.cursor = 'pointer';
                sprite.alpha = 1.0;
            }
        });
    }
    handleCharacterDraftPick(chosenCharacter) {
        const currentPlayerIndex = this.characterDraftingPlayerIndex;
        this.players[currentPlayerIndex].character = chosenCharacter;
        this.faceDownCards = this.faceDownCards.filter(c => c !== chosenCharacter);

        this.currentDraftChoices.forEach(card => {
            const sprite = this.characterSpriteMap.get(card);
            if (sprite) sprite.eventMode = 'none';
        });

        this.characterDraftingPlayerIndex++;

        if (this.characterDraftingPlayerIndex >= this.numPlayers) {
            this.finalizeRound();
        } else {
            this.presentCharacterDraftChoice();
        }
    }
    finalizeRound() {
        this.statsText.text = "Round starting!";
        this.draftOverlay.visible = false;
        this.characterSpriteMap.forEach(sprite => sprite.visible = false);

        this.players.sort((a, b) => a.character.order - b.character.order);
        
        this.currentPlayerIndex = 0;
        const currentPlayer = this.getCurrentPlayer();
        currentPlayer.reveal = true;
        currentPlayer.character.usePassive(currentPlayer);

        this.switchToPickingPhase();
    }
     async otherCards(){
        this.elseTurnContainer.removeChildren();
        
        const currentPlayer = this.getCurrentPlayer();      
        
        const buttonTex = await Assets.load("./miscellaneous/next.png");
        const nextButton = new Sprite(buttonTex);
        nextButton.eventMode = 'static';
        nextButton.x = window.innerWidth - 100;
        nextButton.y = window.innerHeight - 100;
        nextButton.anchor.set(0.5);
        nextButton.width = 80;
        nextButton.height = 80;
        nextButton.on('pointerdown', () => { this.nextTurn();});
        
        this.elseTurnContainer.addChild(nextButton);

        
        const assetBackTexture = await Assets.load("./assets/asset_back.webp");
        const liabilityBackTexture = await Assets.load("./liabilities/liability_back.webp");
        
        const cardSpacing = 200;
        const startX = (window.innerWidth - (currentPlayer.hand.length * cardSpacing)) / 2 + cardSpacing / 2;
        const y = window.innerHeight - 100;

        for (const card of currentPlayer.hand) {
            let backTexture;
            if (card instanceof Asset) {
                backTexture = assetBackTexture;
            } else if (card instanceof Liability) {
                backTexture = liabilityBackTexture;
            }
            const cardBack = new Sprite(backTexture);
            cardBack.scale.set(0.3);
            cardBack.anchor.set(0.5);
            const index = currentPlayer.hand.indexOf(card);
            cardBack.x = startX + (index * cardSpacing);
            cardBack.y = y;
            this.elseTurnContainer.addChild(cardBack);
        }
    }
    async GiveStartHand() {
        const assetDeck = new AssetCards();
        const liabilityDeck = new LiablityCards();

        for (const player of this.players) {
            
            for (let i = 0; i < 2; i++) {
                const assetCard = assetDeck.getRandomCard();
                await assetCard.initializeSprite();
                assetCard.sprite.on('cardPlayed', () => {
                    const cardIndex = player.hand.indexOf(assetCard);
                    if (cardIndex !== -1) {
                        if (player.playAsset(cardIndex)) {
                            this.mainContainer.removeChild(assetCard.sprite);
                            this.mainContainer.addChild(assetCard.sprite);
                        }
                        this.updateUI();
                    }
                });
                player.addCardToHand(assetCard);
                this.mainContainer.addChild(assetCard.sprite);
            }

            
            for (let i = 0; i < 2; i++) {
                const liabilityCard = liabilityDeck.getRandomCard();
                await liabilityCard.initializeSprite();
                liabilityCard.sprite.on('cardPlayed', () => {
                    const cardIndex = player.hand.indexOf(liabilityCard);
                    if (cardIndex !== -1) {
                        if(player.playLiability(cardIndex)){
                            this.mainContainer.removeChild(liabilityCard.sprite);
                            this.mainContainer.addChild(liabilityCard.sprite)
                        }
                        this.updateUI(); 
                    }
                });
                player.addCardToHand(liabilityCard);
                this.mainContainer.addChild(liabilityCard.sprite);
            }
        }
    }
}

export default GameManager;