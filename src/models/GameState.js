import Player from './Player.js';
import { getAllCharacters } from './Characters.js';

class GameState {
    constructor() {
        this.players = [];
        this.myId = null;
        this.username = '';
        this.currentPlayerIndex = 0;
        this.characters = getAllCharacters();
        this.shuffledCharacters = [];
        this.faceUpCharacters = [];
        this.currentPhase = 'lobby';
    }

    setCurrentPlayerIndex(index) {
        if (index >= 0 && index < this.players.length) {
            this.currentPlayerIndex = index;
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getPlayerById(id) {
        return this.players.find(p => p.playerID === id);
    }

    getLocalPlayer() {
        return this.getPlayerById(this.myId);
    }

    resetForNewRound() {
        this.players.forEach(p => {
            p.character = null;
            p.reveal = false;
            p.playableAssets = 1;
            p.playableLiabilities = 1;
            p.maxTempCards = 3;
            p.maxKeepCards = 2;
        });
        this.shuffledCharacters = [];
        this.faceUpCharacters = [];
    }
}

export default GameState;