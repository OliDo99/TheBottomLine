import Asset from './Asset.js';
import Liability from './Liablity.js';
import { Assets, Sprite} from "pixi.js";
class NetworkManager {
    commandList = {
        "DrawCard" : this.drawCard.bind(this),
        "SelectCharacter" : this.selectCharacter.bind(this),
        "StartGame" : this.startGame.bind(this),
        "GameStartedOk" : this.gameStartedOk.bind(this)
    };

    constructor(url, GameManager) {
        this.url = url;
        this.queue = [];
        this.gameManager = GameManager;

        this.connect();

        // Opening message has to contain username & channel for now
        // Allow user input for this later
        //this.sendMessage("{\"username\":\"test\",\"channel\": \"abcd\"}");
    }

    connect() {
        this.connection = new WebSocket(this.url);
        this.connection.addEventListener('message', (msg) => {
            console.log(msg);
            this.handleMessage(msg);

        });

        this.connection.addEventListener("open", () => {
            console.log("Connected");

            this.flushQueue();
        });
        this.connection.addEventListener("close", () => {
            console.log("Connection has closed");
        })
    }

    flushQueue() {
        this.queue.forEach(msg => {this.connection.send(msg);});
    }

    handleMessage(msg) {
        let parsedMessage = JSON.parse(msg.data);
        let invokedCommand = this.commandList[parsedMessage.action];
        if (invokedCommand) {
            invokedCommand(parsedMessage.data);
            console.log(`parse ${parsedMessage.data}`)
        }
    }

    drawCard(data) {
        console.log(data.card_type);
        //this.game.DrawCard(1);
    }

    selectCharacter(data) {
        console.log(data);
    }

    sendMessage(data) {
        console.log("Sending packet:" + data);
        if (this.connection.readyState == WebSocket.OPEN) {
            this.connection.send(data);
        } else {
            this.queue.push(data);
        }
    }

    gameStartedOk(data){
        console.log("YIPI");
    }
   async startGame(data) {
        console.log("Received hand data from server:", data);
        const handData = data.hand;
        
        const player = this.gameManager.players.find(p => p.name == this.gameManager.myName);
        if (!player) {
            console.error("Could not find the local player!");
            return;
        }
       
        for (const card of handData) {
            let newCard;
            
            if ('Left' in card) {
                const cardData = card.Left; 
                newCard = new Asset(
                    cardData.title,
                    cardData.color,
                    cardData.gold_value,
                    cardData.silver_value,
                    cardData.ability,
                    cardData.image_front_url
                );
            } else {
                const cardData = card.Right; 
                newCard = new Liability(
                    cardData.rfr_type, 
                    cardData.value,
                    cardData.image_front_url
                );
            }
            
            
            await newCard.initializeSprite();

            // 4. Add the card to the player's hand and the sprite to the stage
            player.addCardToHand(newCard); // This also makes the card playable
            this.gameManager.mainContainer.addChild(newCard.sprite);
        }

        // 5. Position all the new cards neatly in the player's hand
        player.positionCardsInHand();

        // 6. Call the GameManager to set up the rest of the game state
        // This replaces your old GiveStartHand logic
        await this.gameManager.startGame(); 
    }
}

export default NetworkManager;