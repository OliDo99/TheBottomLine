import Player from './Player.js';

class GameManager {
    constructor(app) {
        this.app = app;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.numPlayers = 7;
        this.initializePlayers();
    }

    initializePlayers() {
        for (let i = 0; i < this.numPlayers; i++) {
            const player = new Player();
            player.cash = 1; // Starting cash
            this.players.push(player);
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    nextTurn() {
        console.log(`Ending turn for Player ${this.currentPlayerIndex + 1}`);
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numPlayers;
        this.updateUI();
    }

    updateUI() {
        // Hide all players' cards
        this.players.forEach(player => {
            player.hand.forEach(card => {
                card.sprite.visible = false;
            });
        });

        // Show current player's cards
        const currentPlayer = this.getCurrentPlayer();
        currentPlayer.hand.forEach(card => {
            card.sprite.visible = true;
        });
        
        // Update stats display for current player
        this.statsText.text = `Player ${this.currentPlayerIndex + 1} | Gold: ${currentPlayer.gold} | Cash: ${currentPlayer.cash} | Silver: ${currentPlayer.silver}`;
    }
}

export default GameManager;