import { Text, Container, Graphics, Assets, Sprite, FillGradient } from "pixi.js";
import { Input,Button } from '@pixi/ui';
import Player from './Player.js';
import AssetCards from "./AssetCards.js";
import LiabilityCards from "./LiabilityCards.js"
import Asset from './Asset.js';
import Liability from './Liability.js';
import { getAllCharacters } from './Characters.js';
import NetworkManager from "./NetworkManager.js";

class GameManager {

    constructor(app) {
        
        this.app = app;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.numPlayers = 4;
        this.username;
        this.myID;
        this.characters = getAllCharacters();

        
        this.characterSpriteMap = new Map();
        this.shuffledCharacters = [];
        this.faceUpCharacters = [];
        this.faceDownCards = [];
        this.characterDraftingPlayerIndex = 0;
        this.currentDraftChoices = [];

        
        this.currentPhase = 'picking'; 
        this.lobbyContainer = new Container();
        this.mainContainer = new Container();
        this.pickingContainer = new Container();
        this.chacacterContainer = new Container();
        this.characterCardsContainer = new Container(); 
        this.handContainer = new Container(); this.elseTurnContainer = new Container();
        this.draftOverlay = new Graphics(); this.draftOverlay.visible = false; // Start with the overlay hidden
        this.statsText = null;
        this.networkManager = new NetworkManager('ws://localhost:3000/websocket', this);

        this.chacacterContainer.addChild(this.characterCardsContainer);
        this.mainContainer.addChild(this.handContainer);
        
        this.handContainer.sortableChildren = true;

        window.addEventListener('beforeunload', (event) => {
            console.log("call a function before reloading");
        });
    }

    async initRound() {
        await this.CreateAssetDeck();
        await this.CreateLiabilityDeck();
        await this.nextButton(this.mainContainer);

        this.currentPhase = 'character';
        this.chacacterContainer.visible = true;
        this.mainContainer.visible = false;
        this.pickingContainer.visible = false;
        this.elseTurnContainer.visible = false;
        this.lobbyContainer.visible = false;
        
        this.draftOverlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0x000000, alpha: 0.7 });
        this.chacacterContainer.addChildAt(this.draftOverlay, 0);
        this.draftOverlay.visible = true;

        this.players.forEach(p => {
            p.character = null;
            p.reveal = false;
            p.playableAssets = 1;
            p.playableLiabilities = 1;
            p.maxTempCards = 3;
            p.maxKeepCards = 2;
        });
    }
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    getGradient(){
         const gradient = new FillGradient({
            type: 'radial',
            center: { x: 0.5, y: 0.5 },
            innerRadius: 0.15,
            outerCenter: { x: 0.5, y: 0.5 },
            outerRadius: 0.5,
            colorStops: [
                { offset: 0, color: 0x4a4949 },
                { offset: 1, color: 0x252525 },
            ],
        });
        return gradient;
    }    
    initLobby() {
        this.lobbyContainer.visible = true;
        this.chacacterContainer.visible = false;
        this.mainContainer.visible = false;
        this.elseTurnContainer.visible = false;
        this.statsText.text = `?/4`;

        this.createInputBox();
        this.createStartGameBox();
    }
    createInputBox(){
        const inputBox = new Input({
            bg: new Graphics().roundRect(0, 0, 200, 40, 5).fill(0x333333),
            padding: [10, 10, 10, 10],
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold'
            },
            placeholder: "Enter Name",
        });
        inputBox.onEnter.connect(val => {
            console.log(val);
            this.networkManager.sendCommand("Connect", { "username": val, "channel": "test" });
            this.username = val; 
        });
        inputBox.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2 - 20);
        this.lobbyContainer.addChild(inputBox);
    }
    createStartGameBox(){
        const startGameButton = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)
                .fill(0xFFFFFF)
        );
        startGameButton.onPress.connect(() => {
            this.networkManager.sendCommand("StartGame");
        });

        this.lobbyContainer.addChild(startGameButton.view);
    }
    startTurnPlayerVisibilty() {
        let player = this.getCurrentPlayer();
        this.chacacterContainer.visible = false;
        this.mainContainer.visible = false;
        this.lobbyContainer.visible = false;

        this.currentPhase = 'picking';

        if (player.playerID == this.myID) { // Use player.playerID for comparison
            this.showLocalPlayerPicking(player);
        } else {
            this.otherPlayerScreenSetup();
        }
        this.updateUI();
    }
    showLocalPlayerPicking(player){
        this.pickingContainer.visible = true;
        this.handContainer.visible = true; // Make hand visible
        this.pickingContainer.removeChildren();
        this.elseTurnContainer.visible = false;
        this.pickingContainer.addChild(this.handContainer);
            // Show assets in the picking container
        
        // Create and add backdrops for temp cards
        const cardWidth = 590 * 0.25; // Approximate card width based on sprite scale
        const cardHeight = 940 * 0.25; // Approximate card height
        const spacing = 180;
        const startX = (window.innerWidth - (player.maxTempCards * spacing)) / 2 + spacing / 2;
        const y = window.innerHeight / 2;

        for (let i = 0; i < player.maxTempCards; i++) {
            const backdrop = this.createCardBackdrop(startX + (i * spacing), y, cardWidth + 10, cardHeight + 10);
            this.pickingContainer.addChild(backdrop);
        }

        player.positionCardsInHand();

        this.CreateAssetDeck();
        this.CreateLiabilityDeck();
    }
    otherPlayerScreenSetup(){
        this.otherCards();
            this.elseTurnContainer.visible = true;
            this.pickingContainer.visible = false;
            this.showAssetData(this.elseTurnContainer);
            this.showCharacterData(this.elseTurnContainer);
    }
    createCardBackdrop(x, y, width, height) {
        const backdrop = new Graphics(); // border
        backdrop.roundRect(0, 0, width, height, 15)
            .stroke({ width: 4, color: 0xCBC28E }) 
            .fill({ alpha: 0 }); 
        backdrop.x = x;
        backdrop.y = y;
        backdrop.pivot.set(width / 2, height / 2);
        return backdrop;
    }
    switchToMainPhase() {
        this.currentPhase = 'main';
        this.handContainer.visible = true;
        this.mainContainer.visible = true;
        this.pickingContainer.visible = false;
        this.chacacterContainer.visible = false;
        this.elseTurnContainer.visible = false;   
        this.showAssetData(this.mainContainer);  
        this.showCharacterData(this.mainContainer);   
        this.getCurrentPlayer().positionCardsInHand();
        
        this.handContainer.sortChildren();

        this.mainContainer.addChild(this.handContainer);
        this.updateUI();
    }
    updateUI() {
        const currentPlayer = this.getCurrentPlayer();

        if (this.currentPhase == 'picking') {
            this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character?.name || 'Error Name'} is picking cards`;
        } else if (this.currentPhase == "main") {
            this.statsText.text = `assets:${currentPlayer.playableAssets}, liablities: ${currentPlayer.playableLiabilities}, cash: ${currentPlayer.cash}`;
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
        const assetDeckSprite = await assetDeck.initializeDeckSprite(); // Keep this to get the sprite
        assetDeck.setDeckPosition(window.innerWidth / 2 - 150, 70); // Position as before
    
        assetDeckSprite.on('mousedown', () => {
            this.networkManager.sendCommand("DrawCard", { "card_type": "Asset" });
        });
        this.pickingContainer.addChild(assetDeckSprite);
        return assetDeckSprite;
    }
    async CreateLiabilityDeck() {
        const liabilityDeck = new LiabilityCards();
        const liabilityDeckSprite = await liabilityDeck.initializeDeckSprite(); // Keep this to get the sprite
        liabilityDeck.setDeckPosition(window.innerWidth / 2 + 150, 70); // Position as before
    
        liabilityDeckSprite.on('mousedown', () => {
            this.networkManager.sendCommand("DrawCard", { "card_type": "Liability" });
        });
        this.pickingContainer.addChild(liabilityDeckSprite);
        return liabilityDeckSprite;
    }
    showAssetData(container) {
        this.players.forEach(async player => {
            let texture;
            if (player.reveal) {
                texture = await Assets.load(player.character.iconPath);
            } else {
                texture = await Assets.load("./miscellaneous/noneCharacter.png"); // HERE
            }

            let characterIcon = new Sprite(texture);
            let x = 30 + this.players.indexOf(player) * 60;
            characterIcon.x = x;
            characterIcon.y = 30;
            characterIcon.width = 50;
            characterIcon.height = 55.7;
            characterIcon.anchor.set(0.5);
            container.addChild(characterIcon);

            player.assetList.forEach(card => {
                const rect2 = new Graphics();
                rect2.fill(card.color);

                let y = 60 + player.assetList.indexOf(card) * 30;
                rect2.roundRect(x - 20, y, 20, 20, 50);
                rect2.fill();

                container.addChild(rect2);
            });
        });
    }
    showCharacterData(container) {
        this.players.forEach(async player => {
        const revealedPlayers = this.players.filter(p => p.reveal).sort((a, b) => a.character.order - b.character.order);

        revealedPlayers.forEach(async (player, index) => {
            let texture;
            texture = await Assets.load(player.character.texturePath);

            let characterCard = new Sprite(texture);
            let y = 50 + index * 100;
            characterCard.x = window.innerWidth - 100;
            characterCard.y = y;
            characterCard.scale.set(0.15);
            characterCard.anchor.set(0.5);
            characterCard.rotation = 90 * Math.PI / 180;
            container.addChild(characterCard);
        }); 
    })
    }
    nextButton(container) {
        const buttonWidth = 150;
        const buttonHeight = 50;

        const buttonContainer = new Container();

        const background = new Graphics()
            .roundRect(0, 0, buttonWidth, buttonHeight, 15)
            .fill(0x473f33); 
        const buttonText = new Text({
            text: "End Turn",
            style: {
                fill: '#000000ff',
                fontSize: 20,
                fontFamily: 'MyFont',
            }
        });
        buttonText.anchor.set(0.5);
        buttonText.position.set(buttonWidth / 2, buttonHeight / 2);

        buttonContainer.addChild(background, buttonText);

        const nextButton = new Button(buttonContainer);
        nextButton.onPress.connect(() => {
            this.networkManager.sendCommand("EndTurn");
        });
        nextButton.view.position.set(window.innerWidth - 100 - (buttonWidth / 2), window.innerHeight - 100 - (buttonHeight / 2));

        container.addChild(nextButton.view);
    }
    async otherCards() {
        this.elseTurnContainer.removeChildren();

        const currentPlayer = this.getCurrentPlayer();

        const othersHand = currentPlayer.othersHand;
        const assets = othersHand.filter(cardType => cardType == 'Asset');
        const liabilities = othersHand.filter(cardType => cardType == 'Liability');

        const baseY = window.innerHeight - 150;
        const spacing = 60; 

        this.initOtherHand(assets, liabilities, baseY, spacing);
       
    }
    async initOtherHand(assets, liabilities,baseY,spacing ){
        const totalAssetsWidth = (assets.length - 1) * spacing;
        const assetsStartX = window.innerWidth / 2 - totalAssetsWidth - 100;
        const assetBackTexture = await Assets.load("./assets/asset_back.webp"); // here

        for (let i = 0; i < assets.length; i++) {
            const cardBack = new Sprite(assetBackTexture);
            cardBack.scale.set(0.3);
            cardBack.anchor.set(0.5);
            cardBack.x = assetsStartX + i * spacing;
            cardBack.y = baseY;
            this.elseTurnContainer.addChild(cardBack);
        }

        
        const totalLiabilitiesWidth = (liabilities.length > 0 ? liabilities.length - 1 : 0) * spacing;
        const liabilitiesStartX = window.innerWidth / 2 + 100 + totalLiabilitiesWidth;
        const liabilityBackTexture = await Assets.load("liabilities/liability_back.webp");

        for (let i = 0; i < liabilities.length; i++) {
            const cardBackTexture = liabilityBackTexture;
            const cardBack = new Sprite(cardBackTexture);
            cardBack.scale.set(0.3);
            cardBack.anchor.set(0.5);
            cardBack.x = liabilitiesStartX - i * spacing;
            cardBack.y = baseY;
            this.elseTurnContainer.addChild(cardBack);
        }
    }
    async messageStartGame(data) {
        console.log("Received StartGame data from server:", data);

        this.players = []; 
        this.myID = data.id;
        let localPlayer = new Player(this.username, data.id);
        localPlayer.reveal = true;
        localPlayer.cash = data.cash;

        this.players.push(localPlayer);

        this.initPlayers(data.player_info);
        
        if (!localPlayer) {
            console.error("Could not find the local player in server data!");
            return;
        }

        for (const cardData of data.hand) {
            let newCard;
            if (cardData.card_type == "asset") {
                newCard = new Asset(
                    cardData.title,
                    cardData.color,
                    cardData.gold_value,
                    cardData.silver_value,
                    cardData.ability,
                    cardData.image_front_url
                );
            } else {
                newCard = new Liability(
                    cardData.rfr_type,
                    cardData.value,
                    cardData.image_front_url
                );
            }
            await newCard.initializeSprite();

            // Attach event listeners for playing/discarding cards
            this.makeCardPlayable(newCard);
            this.makeCardDiscardable(newCard);            

            localPlayer.addCardToHand(newCard);
            this.handContainer.addChild(newCard.sprite);
        }

        localPlayer.positionCardsInHand();
        this.handContainer.sortChildren(); // Sort initial hand cards
        await this.initRound();
    }
    initPlayers(player_info){
        // Initialize all players from player_info
        for (const player_data of player_info) {
            const player = new Player(player_data.name, player_data.id);
            player.cash = player_data.cash;
            player.othersHand = player_data.hand;
            this.players.push(player);
        }
    }
    makeCardPlayable(newCard){
        newCard.sprite.on('cardPlayed', () => {
                const cardIndex = localPlayer.hand.indexOf(newCard);
                if (cardIndex !== -1) {
                    if (newCard instanceof Asset) {                        
                        this.networkManager.sendCommand("BuyAsset", { card_idx: cardIndex });
                    } else if (newCard instanceof Liability) {                        
                        this.networkManager.sendCommand("IssueLiability", { card_idx: cardIndex });
                    }
                    // The server will send back a message to update the UI
                }
            });
    }
    makeCardDiscardable(newCard){
        newCard.sprite.on('cardDiscarded', (discardedCard) => {
            const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
            if (cardIndex !== -1) {
                this.networkManager.sendCommand("PutBackCard", { card_idx: cardIndex+currentPlayer.hand.length });
                this.pickingContainer.removeChild(discardedCard.sprite);
                this.pickingContainer.removeChild(discardedCard.discardButton);
                currentPlayer.tempHand.splice(cardIndex, 1);
                currentPlayer.positionTempCards();

                if (currentPlayer.tempHand.length === currentPlayer.maxKeepCards) {
                    currentPlayer.tempHand.forEach(remainingCard => {
                        currentPlayer.addCardToHand(remainingCard);
                        this.mainContainer.addChild(remainingCard.sprite);
                        if (remainingCard.discardButton) {
                            this.pickingContainer.removeChild(remainingCard.discardButton);
                        }
                    });
                    this.youPutBackCard(); // This will trigger phase switch
                    
                }
            }
        });
    }
    async youDrewCard(data) {
        console.log("You Drew Card:", data);
        const cardData = data.card;
        const currentPlayer = this.getCurrentPlayer();
        let newCard;

        if (cardData.card_type === "asset") {
            newCard = new Asset(
                cardData.title,
                cardData.color,
                cardData.gold_value,
                cardData.silver_value,
                cardData.ability,
                cardData.image_front_url
            );
        } else { // liability
            newCard = new Liability(
                cardData.rfr_type,
                cardData.value,
                cardData.image_front_url
            );
        }

        await newCard.initializeSprite();

        this.makeCardPlayable(newCard);
        this.makeCardDiscardable(newCard);

        currentPlayer.addCardToTempHand(newCard);
        this.pickingContainer.addChild(newCard.sprite);
        if (newCard.discardButton) this.pickingContainer.addChild(newCard.discardButton);
        currentPlayer.positionTempCards();
    }
    async drewCard(data){
        console.log("Drew Card:", data);
        /*const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.playerID != this.myID){
            let cardBack;
            if(data.cardType == 'Asset'){
                const assetBackTexture = await Assets.load("./assets/asset_back.webp");
                cardBack = new Sprite(assetBackTexture);
                cardBack.scale.set(0.3);
                cardBack.anchor.set(0.5);
            }
            else{
                const liabilityBackTexture = await Assets.load("liabilities/liability_back.webp");
                const cardBackTexture = liabilityBackTexture;
                cardBack = new Sprite(cardBackTexture);
                cardBack.scale.set(0.3);
                cardBack.anchor.set(0.5);
            }
            currentPlayer.addCardToTempHand(cardBack);
            this.elseTurnContainer.addChild(cardBack);
            const startX = (window.innerWidth - (3 * 180)) / 2 + 180 / 2;
            const y = window.innerHeight/2; 


            currentPlayer.tempHand.forEach((card, index) => {
                cardBack.x = startX + (index * 180);
                cardBack.y = y;
            });
            this.sprite.x = x;
            this.sprite.y = y;
            //currentPlayer.positionTempCards();

        }*/

    }
    youPutBackCard(data) {
        const currentPlayer = this.getCurrentPlayer();
        // All necessary cards have been put back, now we can move the kept cards to the hand.
        currentPlayer.tempHand.forEach(card => {
            currentPlayer.addCardToHand(card);
            if (card.discardButton) {
                this.pickingContainer.removeChild(card.discardButton);
            }
        });
        currentPlayer.tempHand = [];
        this.switchToMainPhase();
    }
    newPlayer(data) {
        this.statsText.text = `${data.usernames.length} / 4`;
        this.players = [];

        data.usernames.forEach((username, index) => {
            const player = new Player(username, index); // Assign a temporary ID for lobby display
            //this.players.push(player);
            this.players.push(player);
        });
    }
    initCharacters(){
        const totalCharacters = this.faceUpCharacters.length;
        const spacing = 200;
        
        const startX = (window.innerWidth - ((totalCharacters - 1) * spacing)) / 2;

        this.faceUpCharacters.forEach(async (character, index) => {
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
                this.characterCardsContainer.removeChildren();
            });

            // Add the sprite to the dedicated card container
            this.characterCardsContainer.addChild(sprite);
        });
    }
    chairmanSelectCharacter(data){
        const currentPlayer = this.players.find(player => player.playerID === data.chairman_id);
        const turnOrder = data.turnOrder;
        this.statsText.text = `${currentPlayer.name} is chosing their characeter`;
        currentPlayer.isChaiman = true;
        console.log("Received selectable characters:", data);


        if(currentPlayer.playerID == this.myID){
            this.faceUpCharacters = this.characters.filter(character => data.pickable_characters.characters.includes(character.textureName));
            console.log("Face Up Characters:", this.faceUpCharacters);
            this.initCharacters();

        }
    }
    receiveSelectableCharacters(data) {
        this.chacacterContainer.visible = true;
        if(data.currently_picking_id == null){ // is this still nececery?
            return;
        }
        console.log("Received selectable characters:", data);
        
        const currentPlayer = this.players.find(player => player.playerID === data.currently_picking_id);
        this.statsText.text = `${currentPlayer.name} is chosing their characeter`;
        if (currentPlayer.playerID == this.myID) {
            this.faceUpCharacters = this.characters.filter(character => data.pickable_characters.characters.includes(character.textureName));
            console.log("Face Up Characters:", this.faceUpCharacters);
            this.initCharacters();
            
        } else {
            console.log("Not player's turn for character selection.");
        }

        
    }
    youSelectedCharacter(data) {
        // This function might be used to confirm your character selection
        const localPlayer = this.players.find(p => p.playerID === this.myID);
        if (localPlayer) {
            localPlayer.character = this.characters.find(c => c.textureName === data.character);
            console.log(`Local player ${localPlayer.name} selected ${localPlayer.character.name}`);
        }
    }
    turnStarts(data) {
        console.log("Received TurnStart data from server:", data);

        const drawableCards = data.draws_n_cards;
        const recieveCash = data.player_turn_cash;

        this.statsText.text = `${data.player_character}'s turn`;
        const nextPlayerIndex = this.players.findIndex(p => p.playerID == data.player_turn);

        if (nextPlayerIndex !== -1) {
            this.currentPlayerIndex = nextPlayerIndex;
            const currentPlayer = this.players[this.currentPlayerIndex];
            const character = this.characters.find(c => c.textureName === data.player_character);
            if (character) {
                currentPlayer.character = character;
            } else {
                console.error(`Character with name ${data.player_character} not found.`);
            }

            currentPlayer.playableAssets = 1;
            currentPlayer.playableLiabilities = 1;
            currentPlayer.cash += recieveCash;
            currentPlayer.maxTempCards = drawableCards;
            currentPlayer.reveal = true;
            currentPlayer.tempHand = [];
            this.startTurnPlayerVisibilty();

        } else {
            console.error(`Player with ID ${data.player_turn} not found.`);
        }
    }
    youBoughtAsset(data){
        const player = this.players.find(p => p.playerID === this.myID);
        if (!player) return;

        const card = player.hand.find(c => c.title === data.asset.title && c.gold === data.asset.gold_value && c.silver === data.asset.silver_value);
        if (!card) return;

        const cardIndex = player.hand.indexOf(card);
        if (cardIndex === -1) return;

        player.cash -= card.gold;
        player.gold += card.gold;
        player.silver += card.silver;
        player.assetList.push(card);
        player.hand.splice(cardIndex, 1);
        player.playableAssets--;


        player.positionCardsInHand();
        player.moveAssetToPile(card);
        this.updateUI();
    }
    boughtAsset(data){
        const player = this.players.find(p => p.playerID === data.player_id);
        if (!player) return;

        const assetIndex = player.othersHand.indexOf('Asset');
        if (assetIndex > -1) {
            player.othersHand.splice(assetIndex, 1);
        }
        this.updateUI();
    }
    youIssuedLiability(data){
        const player = this.players.find(p => p.playerID === this.myID);
        if (!player) return;

        const card = player.hand.find(c => c.title === data.liability.rfr_type && c.gold === data.liability.value);
        if (!card) return;

        const cardIndex = player.hand.indexOf(card);
        if (cardIndex === -1) return;

        player.cash += card.gold;
        player.liabilityList.push(card);
        player.hand.splice(cardIndex, 1);
        player.playableLiabilities--;

        player.positionCardsInHand();
        player.moveLiabilityToPile(card);
        this.updateUI();
    }
    issuedLiability(data){
        const player = this.players.find(p => p.playerID === data.player_id);
        if (!player) return;

        const liabilityIndex = player.othersHand.indexOf('Liability');
        if (liabilityIndex > -1) {
            player.othersHand.splice(liabilityIndex, 1);
        }
        this.updateUI();
    }

}

export default GameManager;