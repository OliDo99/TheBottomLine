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

        
        this.characterSpriteMap = new Map();
        this.shuffledCharacters = [];
        this.faceUpCards = [];
        this.faceDownCards = [];
        this.characterDraftingPlayerIndex = 0;
        this.currentDraftChoices = [];

        
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
        //await this.GrabCharacters(); 
        await this.CreateAssetDeck();
        await this.CreateLiabilityDeck();
        await this.nextButton(this.mainContainer);
        
        
        
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
        this.statsText.text = `?/4`
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
            this.networkManager.sendCommand("Connect", {"username":val,"channel":"test"});

            this.myName = val;
        });
        myInput.position.set(window.innerWidth/2-100, window.innerHeight/2-20);
        

        const button = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)
                .fill(0xFFFFFF)
        );
        button.onPress.connect(() =>  {
            this.networkManager.sendCommand("StartGame");
           
        });

        const button2 = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)

                .fill(0xFFFFF)
        );
        button2.onPress.connect(() =>    this.networkManager.sendCommand("GetSelectableCharacters"));

        this.lobbyContainer.addChild(button.view);
        this.chacacterContainer.addChild(button2.view);
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
            player.hand.forEach(card => {
                this.pickingContainer.addChild(card.sprite);

            });
            player.positionCardsInHandPicking();
        }
        else{
            this.otherCards();
            this.elseTurnContainer.visible = true;
            this.pickingContainer.visible = false;
            this.showAssetData(this.elseTurnContainer);
            this.showCharacterData(this.elseTurnContainer);
            this.elseTurnContainer.addChild(this.statsText);
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
        this.mainContainer.addChild(this.statsText);
        this.updateUI();
    }
    nextTurn() {
        console.log(this.players);

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
        this.lobbyContainer.visible = false;
        
       
        this.draftOverlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0x000000, alpha: 0.7 });
        this.chacacterContainer.addChildAt(this.draftOverlay, 0);
        this.draftOverlay.visible = true;
        
        this.chacacterContainer.addChild(this.statsText);
        
        this.players.forEach(p => {
            // reset Values
            p.character = null;
            p.reveal = false;
            p.playableAssets = 1;
            p.playableLiabilities = 1;
            p.maxTempCards = 3;
            p.maxKeepCards = 2;
        });

        
    }
    updateUI() {
        const currentPlayer = this.getCurrentPlayer();
        
        if (this.currentPhase == 'picking') {
            this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character.name} is picking cards`;
        } else if(this.currentPhase == "main"){
            //this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character.name} is playing | ${currentPlayer.cash}`;
            this.statsText.text = `assets:${currentPlayer.playableAssets}, liablities: ${currentPlayer.playableLiabilities}`;
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

        assetDeck.setDeckPosition(window.innerWidth/2-150, 70);

        assetDeckSprite.on('mousedown', async () => {
            
            this.networkManager.sendCommand("DrawCard");
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
    
        liabilityDeck.setDeckPosition(window.innerWidth/2+150, 70);

        liabilityDeckSprite.on('mousedown', async () => {

            this.networkManager.sendCommand("DrawCard",{ "card_type": "Liability" });


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

    async messageStartGame(data) {
        console.log("Received hand data from server:", data);
        const handData = data.hand;
       
        const player = this.players.find(p => p.name == this.myName);
        if (!player) {
            console.error("Could not find the local player!");
            return;
        }
        this.statsText.text = `${this.players[this.currentPlayerIndex].name} Is Selecting Their Character`;

        for (const card of handData) {

            let newCard;
            
            if (card.card_type == "asset") {
               
                newCard = new Asset(
                    card.title,
                    card.color,
                    card.gold_value,
                    card.silver_value,
                    card.ability,
                    card.image_front_url
                );
                await newCard.initializeSprite();
                newCard.sprite.on('cardPlayed', () => {
                const cardIndex = player.hand.indexOf(newCard);
                if (cardIndex !== -1) {
                    if (player.playAsset(cardIndex)) {
                        this.mainContainer.removeChild(newCard.sprite);
                        this.mainContainer.addChild(newCard.sprite);
                    }
                    this.updateUI();
                }
            });
            } else {
                newCard = new Liability(
                    card.rfr_type, 
                    card.value,
                    card.image_front_url
                );
                await newCard.initializeSprite();
                newCard.sprite.on('cardPlayed', () => {
                const cardIndex = player.hand.indexOf(newCard);
                if (cardIndex !== -1) {
                    if(player.playLiability(cardIndex)){
                        this.mainContainer.removeChild(newCard.sprite);
                        this.mainContainer.addChild(newCard.sprite)
                    }
                    this.updateUI();
                }
            });
            }
            player.addCardToHand(newCard); 
            this.mainContainer.addChild(newCard.sprite);
        }
        
        player.positionCardsInHand();

        this.networkManager.sendCommand("GetSelectableCharacters");

        await this.startGame(); 
    }

    newPlayer(data) {
        this.statsText.text = `${data.usernames.length} / 4`;
        this.players = [];
        
        data.usernames.forEach(username => {
            const player = new Player(username);
            this.players.push(player);
        });
    }
    receiveSelectableCharacters(data) {
        this.chacacterContainer.visible  = true;    
       
        console.log("Received selectable characters:", data);
        
        const allowedNames = data.pickable_characters.characters;

        this.faceUpCards = this.characters.filter(character => allowedNames.includes(character.textureName));
        console.log("Face Up Cards:", this.faceUpCards);

        const totalCharacters = this.faceUpCards.length;
        const spacing = 200; 
        const startX = (window.innerWidth - (totalCharacters * spacing)) / 2; 

        this.faceUpCards.forEach(async(character, index) => {
            const texture = await Assets.load(character.texturePath);
            const sprite = new Sprite(texture); 
            sprite.interactive = true; 
            sprite.buttonMode = true; 
            sprite.scale.set(0.3);
            sprite.anchor.set(0.5);

          
            sprite.x = startX + index * spacing; 
            sprite.y = window.innerHeight / 2; 

            
            sprite.on('pointerdown', () => {
                this.networkManager.sendCommand("SelectCharacter", { "character": character.textureName });
                console.log(`Selected character: ${character.textureName}`); 
                this.players[this.currentPlayerIndex].character = character;
            });

            this.chacacterContainer.addChild(sprite); 
        });
       
    }
    selectCharacter(data) {

    }
    characterSelectionOk(data){
        this.switchToPickingPhase();

    }
}

export default GameManager;