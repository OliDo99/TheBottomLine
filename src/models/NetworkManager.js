import GameManager from "./models/GameManager.js";
class NetworkManager {
    commandList = {
        "DrawCard" : this.drawCard,
        "SelectCharacter" : this.selectCharacter
    };
    constructor(url, game) {
        this.url = url;
        this.game = game;
        this.queue = [];

        this.connect();

        // Opening message has to contain username & channel for now
        // Allow user input for this later
        this.sendMessage("{\"username\":\"test\",\"channel\": \"abcd\"}");
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
        parsedMessage = JSON.parse(msg);
        invokedCommand = commandList[parsedMessage.action];
        if (invokedCommand) {
            invokedCommand(parsedMessage.data);
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
}

export default NetworkManager;