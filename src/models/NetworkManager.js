class NetworkManager {
    constructor(url, gameManager) {
        this.url = url;
        this.queue = [];
        this.gameManager = gameManager;

        this.commandList = {
            "StartGame" : this.gameManager.messageStartGame.bind(this.gameManager),            
            "PlayersInLobby" : this.gameManager.newPlayer.bind(this.gameManager),
            "SelectingCharacters": this.gameManager.chairmanSelectCharacter.bind(this.gameManager),
            "YouDrewCard": this.gameManager.youDrewCard.bind(this.gameManager),
            "DrewCard": this.gameManager.drewCard.bind(this.gameManager),
            "YouPutBackCard": this.gameManager.youPutBackCard.bind(this.gameManager),
            "SelectedCharacter" : this.gameManager.receiveSelectableCharacters.bind(this.gameManager), 
            "YouSelectedCharacter": this.gameManager.youSelectedCharacter.bind(this.gameManager),
            "TurnStarts": this.gameManager.turnStarts.bind(this.gameManager),
            "YouBoughtAsset": this.gameManager.youBoughtAsset.bind(this.gameManager),
            "BoughtAsset":this.gameManager.boughtAsset.bind(this.gameManager),
            "YouIssuedLiability":this.gameManager.youIssuedLiability.bind(this.gameManager),
            "IssuedLiability":this.gameManager.issuedLiability.bind(this.gameManager),
        };

        this.connect();
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
        }
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

   
}

export default NetworkManager;