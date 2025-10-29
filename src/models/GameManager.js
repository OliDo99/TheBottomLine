import { Text, Container,Graphics,Assets, Sprite} from "pixi.js";
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
        this.myID = 1;
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
        this.elseTurnContainer = new Container();
        this.draftOverlay = new Graphics();
        this.statsText = new Text({
            text: '',
            style: {
                fill: '#ffffff',
                fontSize: 36,
                fontFamily: 'MyFont',
            }
        });
        this.networkManager = new NetworkManager('ws://localhost:3000/websocket', this);
    }

    initializePlayers() {
        // This function might become redundant if players are always initialized from server data
        // For now, it's kept but its usage might change.
        for (let i = 0; i < this.numPlayers; i++) {
            const player = new Player(`Player ${i + 1}`, i); // Assign a default name and ID
            player.cash = 1;
            this.players.push(player);
        }
    }

    async startGame() {
        await this.CreateAssetDeck();
        await this.CreateLiabilityDeck();
        await this.nextButton(this.mainContainer);
        this.newRound();
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    switchToLobby() {
        this.lobbyContainer.visible = true;
        this.chacacterContainer.visible = false;
        this.mainContainer.visible = false;
        this.elseTurnContainer.visible = false;
        this.statsText.text = `?/4`;

        const myInput = new Input({
            bg: new Graphics().roundRect(0, 0, 200, 40, 5).fill(0x333333),
            padding: [10, 10, 10, 10],
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold'
            },
            placeholder: "Enter Name",
        });
        myInput.onEnter.connect(val => {
            console.log(val);
            this.networkManager.sendCommand("Connect", { "username": val, "channel": "test" });
            this.username = val; // Temporarily store username as myID until server assigns actual ID
        });
        myInput.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2 - 20);

        const button = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)
                .fill(0xFFFFFF)
        );
        button.onPress.connect(() => {
            this.networkManager.sendCommand("StartGame");
        });

        this.lobbyContainer.addChild(button.view);
        this.lobbyContainer.addChild(myInput);
    }

    switchToPickingPhase() {
        let player = this.getCurrentPlayer();
        this.chacacterContainer.visible = false;
        this.mainContainer.visible = false;
        this.lobbyContainer.visible = false;

        this.currentPhase = 'picking';

        if (player.playerID == this.myID) { // Use player.playerID for comparison
            this.pickingContainer.visible = true;
            this.elseTurnContainer.visible = false;
            this.showAssetData(this.mainContainer);
            this.showCharacterData(this.mainContainer);
            player.hand.forEach(card => {
                this.pickingContainer.addChild(card.sprite);
            });
            player.positionCardsInHandPicking();
        } else {
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
        this.chacacterContainer.visible = false;
        this.elseTurnContainer.visible = false;
        this.getCurrentPlayer().positionCardsInHand();
        this.mainContainer.addChild(this.statsText);
        this.updateUI();
    }

    nextTurn() {
        this.networkManager.sendCommand("EndTurn");
        
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
            this.statsText.text = `Name: ${currentPlayer.name} = ${currentPlayer.character?.name || 'Error Name'} is picking cards`;
        } else if (this.currentPhase == "main") {
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
        assetDeck.setDeckPosition(window.innerWidth / 2 - 150, 70);

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

                        if (currentPlayer.tempHand.length == currentPlayer.maxKeepCards) {
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
        this.pickingContainer.addChild(assetDeckSprite);
        return assetDeckSprite;
    }

    async CreateLiabilityDeck() {
        const liabilityDeck = new LiabilityCards();
        const liabilityDeckSprite = await liabilityDeck.initializeDeckSprite();
        liabilityDeck.setDeckPosition(window.innerWidth / 2 + 150, 70);

        liabilityDeckSprite.on('mousedown', async () => {
            this.networkManager.sendCommand("DrawCard", { "card_type": "Liability" });

            const currentPlayer = this.getCurrentPlayer();
            if (currentPlayer.tempHand.length < currentPlayer.maxTempCards) {
                const card = liabilityDeck.getRandomCard();
                await card.initializeSprite();

                card.sprite.on('cardPlayed', () => {
                    const cardIndex = currentPlayer.hand.indexOf(card);
                    if (cardIndex !== -1) {
                        if (currentPlayer.playLiability(cardIndex)) {
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

                        if (currentPlayer.tempHand.length == currentPlayer.maxKeepCards) {
                            currentPlayer.tempHand.forEach(remainingCard => {
                                this.mainContainer.addChild(remainingCard.sprite);
                                currentPlayer.addCardToHand(remainingCard);
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

    async nextButton(container) {
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
        nextButton.y = window.innerHeight - 100;
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
        //currentPlayer.character.usePassive(currentPlayer);

        this.switchToPickingPhase();
    }

    async otherCards() {
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
        nextButton.on('pointerdown', () => { this.nextTurn(); });

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
        console.log("Received StartGame data from server:", data);

        this.players = []; // Clear existing players
        this.myID = data.id;
        let localPlayer = new Player(this.username, data.id);
        this.players.push(localPlayer);

        // Initialize all players from player_info
        for (const player_data of data.player_info) {
            const player = new Player(player_data.name, player_data.id);
            player.cash = player_data.cash;
            player.serverHandInfo = player_data.hand; // Store simplified hand info for other players
            
            this.players.push(player);
        }

        // Sort players by their server-assigned ID for consistent order
        this.players.sort((a, b) => a.playerID - b.playerID);

        if (!localPlayer) {
            console.error("Could not find the local player in server data!");
            return;
        }

        this.statsText.text = `${this.players[this.currentPlayerIndex].name} Is Selecting Their Character`;

        // Process local player's hand (actual card objects)
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
            newCard.sprite.on('cardPlayed', () => {
                const cardIndex = localPlayer.hand.indexOf(newCard);
                if (cardIndex !== -1) {
                    if (newCard instanceof Asset) {
                        if (localPlayer.playAsset(cardIndex)) {
                            this.mainContainer.removeChild(newCard.sprite);
                            this.mainContainer.addChild(newCard.sprite);
                        }
                    } else if (newCard instanceof Liability) {
                        if (localPlayer.playLiability(cardIndex)) {
                            this.mainContainer.removeChild(newCard.sprite);
                            this.mainContainer.addChild(newCard.sprite);
                        }
                    }
                    this.updateUI();
                }
            });

            newCard.sprite.on('cardDiscarded', (discardedCard) => {
                const cardIndex = localPlayer.tempHand.indexOf(discardedCard);
                if (cardIndex !== -1) {
                    this.pickingContainer.removeChild(discardedCard.sprite);
                    this.pickingContainer.removeChild(discardedCard.discardButton);
                    localPlayer.tempHand.splice(cardIndex, 1);

                    if (localPlayer.tempHand.length === localPlayer.maxKeepCards) {
                        localPlayer.tempHand.forEach(remainingCard => {
                            localPlayer.addCardToHand(remainingCard);
                            this.mainContainer.addChild(remainingCard.sprite);
                            this.pickingContainer.removeChild(remainingCard.discardButton);
                            localPlayer.tempHand = [];
                            this.switchToMainPhase();
                        });
                    }
                    localPlayer.positionCardsInHand();
                }
            });

            localPlayer.addCardToHand(newCard);
            this.mainContainer.addChild(newCard.sprite);
        }

        localPlayer.positionCardsInHand();
        await this.startGame();
    }

    newPlayer(data) {
        this.statsText.text = `${data.usernames.length} / 4`;
        this.players = [];

        data.usernames.forEach((username, index) => {
            const player = new Player(username, index); // Assign a temporary ID for lobby display
            //this.players.push(player);
        });
    }

    receiveSelectableCharacters(data) {
        this.chacacterContainer.visible = true;
        console.log("Received selectable characters:", data);

        if (data.pickable_characters != null) {
            // this.myID is already set to the server-assigned ID in messageStartGame
            // const allowedNames = data.pickable_characters.characters; // Assuming this is an array of character textureNames

            this.faceUpCharacters = this.characters.filter(character => data.pickable_characters.characters.includes(character.textureName));
            console.log("Face Up Characters:", this.faceUpCharacters);

            const totalCharacters = this.faceUpCharacters.length;
            const spacing = 200;
            const startX = (window.innerWidth - (totalCharacters * spacing)) / 2;

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
                    // The server will confirm the selection, no need to assign locally yet
                });

                this.chacacterContainer.addChild(sprite);
            });
        } else {
            this.players.forEach(player=>{

                console.log(`data:${data.currenty_piclikng_id} vs player:${player.playerID}`);
            
                if (player.playerID == data.player_id){
                    console.log(`Found him ${player.name}`);
                    this.statsText = `${player.name} is chosing their character`;
                }
            })
           
            console.log("Not player's turn for character selection.");
        }

        
    }

    selectCharacter(data) {
        // This function might be used to update other players' character selections
    }

    characterSelectionOk(data) {
        // This function might be used to signal that character selection is complete
        this.switchToPickingPhase();
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
        /*data.player_turn = id
        player_turn_cash
        player_character
        draws_n_cards
        skipped_characters = list[]*/
        console.log(this.players)
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
            currentPlayer.reveal = true;
            currentPlayer.tempHand = [];
            this.switchToPickingPhase();
        } else {
            console.error(`Player with ID ${data.player_turn} not found.`);
        }
    }
}

export default GameManager;