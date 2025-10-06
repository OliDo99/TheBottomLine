class NetworkManager {
    constructor(url) {
        this.url = url;
        this.queue = [];

        this.connect();

        this.sendMessage("{\"username\":\"test\",\"channel\": \"abcd\"}");
    }

    connect() {
        this.connection = new WebSocket(this.url);
        this.connection.addEventListener('message', (msg) => {console.log(msg);});
        this.connection.addEventListener("open", () => {
            console.log("Connected");

            this.flushQueue(); 
        });
        crash();
    }

    flushQueue() {
        this.queue.forEach(msg => {this.connection.send(msg);});
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