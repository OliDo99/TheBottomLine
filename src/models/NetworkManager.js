import Asset from './Asset.js';
import Liability from './Liablity.js';
import { Assets, Sprite} from "pixi.js";
import GameManager from './GameManager.js';
class NetworkManager {
    constructor(url, gameManager) {
        this.url = url;
        this.queue = [];
        this.gameManager = gameManager;

        this.commandList = {
            "DrawCard" : this.drawCard.bind(this),
            "SelectCharacter" : this.selectCharacter.bind(this),
            "StartGame" : this.gameManager.messageStartGame.bind(this),
            "GameStartedOk" : this.gameStartedOk.bind(this)
        };

        this.connect();

        // Opening message has to contain username & channel for now
        // Allow user input for this later
        this.data = {
            "username" : "test",
            "channel" : "abcd"
        }
        //this.sendCommand()
        //this.sendMessage(JSON.stringify(this.data, null, 0));
        //this.sendCommand("login", this.data);
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
        console.log("Sending packet: " + data);
        if (this.connection.readyState == WebSocket.OPEN) {
            this.connection.send(data);
        } else {
            this.queue.push(data);
        }
    }

    sendCommand(command, data) {
        this.packet = {
            "action" : command,
            "data" : data
        }
        this.jsonData = JSON.stringify(this.packet, null, 0);
        console.log(this.jsonData);
        this.sendMessage(this.jsonData);
    }

    gameStartedOk(data){
        console.log("YIPI");
    }
}

export default NetworkManager;