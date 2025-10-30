import Player from './Player.js';
import Asset from './Asset.js';
import Liability from './Liability.js';


class GameManager {

    constructor(gameState, uiManager, networkManager) {
        
        this.gameState = gameState;
        this.uiManager = uiManager;
        this.networkManager = networkManager;

        this.gameState.currentPhase = 'lobby';

        window.addEventListener('beforeunload', (event) => {
            console.log("call a function before reloading");
        });
    }

    async initRound() {
        await this.uiManager.createAssetDeck(() => this.networkManager.sendCommand("DrawCard", { "deck": "Asset" }));
        await this.uiManager.createLiabilityDeck(() => this.networkManager.sendCommand("DrawCard", { "deck": "Liability" }));

        this.gameState.currentPhase = 'character';
        this.uiManager.characterContainer.visible = true;
        this.uiManager.mainContainer.visible = false;
        this.uiManager.pickingContainer.visible = false;
        this.uiManager.elseTurnContainer.visible = false;
        this.uiManager.lobbyContainer.visible = false;
        
        this.uiManager.draftOverlay.clear().rect(0, 0, this.uiManager.app.screen.width, this.uiManager.app.screen.height).fill({ color: 0x000000, alpha: 0.7 });

        this.uiManager.characterContainer.addChildAt(this.uiManager.draftOverlay, 0);
        this.uiManager.draftOverlay.visible = true;

        this.gameState.players.forEach(p => {
            p.character = null;
            p.reveal = false;
            p.playableAssets = 1;
            p.playableLiabilities = 1;
            p.maxTempCards = 3;
            p.maxKeepCards = 2;
        });
    }  
    initLobby() {
        this.uiManager.showScreen('lobby');
        this.uiManager.createInputBox(val => {
            console.log(val);
            this.networkManager.sendCommand("Connect", { "username": val, "channel": "test" });
            this.gameState.username = val; 
        });
        this.uiManager.createStartGameBox(() => {
            this.networkManager.sendCommand("StartGame");
        });
    }
    startTurnPlayerVisibilty() {
        let player = this.gameState.getCurrentPlayer();

        this.gameState.currentPhase = 'picking';

        if (player.playerID == this.gameState.myId) { // Use player.playerID for comparison
            this.showLocalPlayerPicking(player);
        } else {
            this.otherPlayerScreenSetup();
        }
        this.updateUI();
    }
    showLocalPlayerPicking(player){
        this.uiManager.showScreen('picking');
        this.uiManager.displayTempCards(player);

        player.positionCardsInHand();

        this.uiManager.createAssetDeck(() => this.networkManager.sendCommand("DrawCard", { "card_type": "Asset" }));
        this.uiManager.createLiabilityDeck(() => this.networkManager.sendCommand("DrawCard", { "card_type": "Liability" }));
    }
    otherPlayerScreenSetup(){
        this.otherCards();
        this.uiManager.showScreen('elseTurn');
        this.uiManager.elseTurnContainer.removeChildren();
        this.uiManager.displayPlayerAssets(this.gameState.players, this.uiManager.elseTurnContainer);
        this.uiManager.displayRevealedCharacters(this.gameState.players, this.uiManager.elseTurnContainer);
    }
    switchToMainPhase() {
        this.gameState.currentPhase = 'main';
        this.uiManager.showScreen('main');

        this.uiManager.mainContainer.removeChildren();
        this.uiManager.createNextTurnButton(() => this.networkManager.sendCommand("EndTurn"));
        this.uiManager.displayPlayerAssets(this.gameState.players, this.uiManager.mainContainer);
        this.uiManager.displayRevealedCharacters(this.gameState.players, this.uiManager.mainContainer);
        this.gameState.getCurrentPlayer().positionCardsInHand();
        
        this.uiManager.handContainer.sortChildren();

        this.uiManager.mainContainer.addChild(this.uiManager.handContainer);
        this.updateUI();
    }
    updateUI() {
        const currentPlayer = this.gameState.getCurrentPlayer();

        if (this.gameState.currentPhase == 'picking') {
            this.uiManager.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character?.name || 'Error Name'} is picking cards`;
        } else if (this.gameState.currentPhase == "main") {
            this.uiManager.statsText.text = `assets:${currentPlayer.playableAssets}, liablities: ${currentPlayer.playableLiabilities}, cash: ${currentPlayer.cash}`;
        }

        this.gameState.players.forEach(player => {
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
    
    async otherCards() {
        const currentPlayer = this.gameState.getCurrentPlayer();

        const othersHand = currentPlayer.othersHand;
        const assets = othersHand.filter(cardType => cardType == 'Asset');
        const liabilities = othersHand.filter(cardType => cardType == 'Liability');

        this.uiManager.displayOtherPlayerHand(assets, liabilities);
       
    }
    async messageStartGame(data) {
        console.log("Received StartGame data from server:", data);

        this.gameState.players = []; 
        this.gameState.myId = data.id;
        let localPlayer = new Player(this.gameState.username, data.id);
        localPlayer.reveal = true;
        localPlayer.cash = data.cash;

        this.gameState.players.push(localPlayer);

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
            this.uiManager.handContainer.addChild(newCard.sprite);
        }

        localPlayer.positionCardsInHand();
        this.uiManager.handContainer.sortChildren(); // Sort initial hand cards
        this.initRound();
    }

    initPlayers(player_info){
        // Initialize all players from player_info
        for (const player_data of player_info) {
            const player = new Player(player_data.name, player_data.id);
            player.cash = player_data.cash;
            player.othersHand = player_data.hand;
            this.gameState.players.push(player);
        }
    }
    makeCardPlayable(newCard){
        const localPlayer = this.gameState.getLocalPlayer();
        newCard.sprite.on('cardPlayed', () => { // `localPlayer` is not defined here. It should be retrieved.
                const cardIndex = localPlayer.hand.indexOf(newCard); // Assuming localPlayer is accessible
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
        const currentPlayer = this.gameState.getCurrentPlayer();
        newCard.sprite.on('cardDiscarded', (discardedCard) => {
            const cardIndex = currentPlayer.tempHand.indexOf(discardedCard);
            if (cardIndex !== -1) {
                this.networkManager.sendCommand("PutBackCard", { card_idx: cardIndex+currentPlayer.hand.length });
                this.uiManager.tempCardsContainer.removeChild(discardedCard.sprite);
                this.uiManager.tempCardsContainer.removeChild(discardedCard.discardButton);
                currentPlayer.tempHand.splice(cardIndex, 1);
                currentPlayer.positionTempCards();

                if (currentPlayer.tempHand.length === currentPlayer.maxKeepCards) {
                    currentPlayer.tempHand.forEach(remainingCard => {
                        currentPlayer.addCardToHand(remainingCard);
                        this.uiManager.mainContainer.addChild(remainingCard.sprite);
                        if (remainingCard.discardButton) {
                            this.uiManager.tempCardsContainer.removeChild(remainingCard.discardButton);
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
        const currentPlayer = this.gameState.getCurrentPlayer();
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
        this.uiManager.displayTempCards(currentPlayer);
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
        const currentPlayer = this.gameState.getCurrentPlayer();
        // All necessary cards have been put back, now we can move the kept cards to the hand.
        currentPlayer.tempHand.forEach(card => {
            currentPlayer.addCardToHand(card);
            if (card.discardButton) {
                this.uiManager.tempCardsContainer.removeChild(card.discardButton);
            }
        });
        currentPlayer.tempHand = [];
        this.switchToMainPhase();
    }
    newPlayer(data) {
        this.uiManager.statsText.text = `${data.usernames.length} / 4 Players`;
        this.gameState.players = [];

        data.usernames.forEach((username, index) => {
            const player = new Player(username, index); // Assign a temporary ID for lobby display
            this.gameState.players.push(player);
        });
    }

    chairmanSelectCharacter(data){
        const currentPlayer = this.gameState.getPlayerById(data.chairman_id); // This is now correct
        this.uiManager.statsText.text = `${currentPlayer.name} is choosing their character`;
        currentPlayer.isChaiman = true;
        console.log("Received selectable characters:", data);

        if (currentPlayer.playerID === this.gameState.myId) {
            this.gameState.faceUpCharacters = this.gameState.characters.filter(character =>
                data.pickable_characters.characters.includes(character.textureName)
            );
            this.uiManager.displayCharacterSelection(this.gameState.faceUpCharacters, (character) => {
                this.networkManager.sendCommand("SelectCharacter", { "character": character.textureName });
                console.log(`Selected character: ${character.textureName}`);
                this.uiManager.characterCardsContainer.removeChildren();
            });
        }
    }

    receiveSelectableCharacters(data) {
        this.uiManager.showScreen('character');
        if(data.currently_picking_id == null){ // is this still nececery?
            return;
        }
        console.log("Received selectable characters:", data);
        
        const currentPlayer = this.gameState.getPlayerById(data.currently_picking_id);
        this.uiManager.statsText.text = `${currentPlayer.name} is choosing their character`;
        if (currentPlayer.playerID === this.gameState.myId) {
            this.gameState.faceUpCharacters = this.gameState.characters.filter(character =>
                data.pickable_characters.characters.includes(character.textureName)
            );
            this.uiManager.displayCharacterSelection(this.gameState.faceUpCharacters, (character) => {
                this.networkManager.sendCommand("SelectCharacter", { "character": character.textureName });
                console.log(`Selected character: ${character.textureName}`);
                this.uiManager.characterCardsContainer.removeChildren();
            });
        } else {
            console.log("Not player's turn for character selection.");
        }

        
    }
    youSelectedCharacter(data) {
        // This function might be used to confirm your character selection
        const localPlayer = this.gameState.getLocalPlayer();
        if (localPlayer) {
            localPlayer.character = this.gameState.characters.find(c => c.textureName === data.character);
            console.log(`Local player ${localPlayer.name} selected ${localPlayer.character.name}`);
        }
    }
    turnStarts(data) {
        console.log("Received TurnStart data from server:", data);

        const drawableCards = data.draws_n_cards;
        const recieveCash = data.player_turn_cash;

        this.uiManager.statsText.text = `${data.player_character}'s turn`;
        const nextPlayerIndex = this.gameState.players.findIndex(p => p.playerID == data.player_turn);

        if (nextPlayerIndex !== -1) {
            this.gameState.setCurrentPlayerIndex(nextPlayerIndex);
            const currentPlayer = this.gameState.getCurrentPlayer();
            const character = this.gameState.characters.find(c => c.textureName === data.player_character);
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
        const player = this.gameState.getLocalPlayer();
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
        const player = this.gameState.getPlayerById(data.player_id);
        if (!player) return;

        const assetIndex = player.othersHand.indexOf('Asset');
        if (assetIndex > -1) {
            player.othersHand.splice(assetIndex, 1);
        }
        this.updateUI();
    }
    youIssuedLiability(data){
        const player = this.gameState.getLocalPlayer();
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
        const player = this.gameState.getPlayerById(data.player_id);
        if (!player) return;

        const liabilityIndex = player.othersHand.indexOf('Liability');
        if (liabilityIndex > -1) {
            player.othersHand.splice(liabilityIndex, 1);
        }
        this.updateUI();
    }

}

export default GameManager;