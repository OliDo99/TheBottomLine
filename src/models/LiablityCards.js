import { Assets, Sprite } from 'pixi.js';
import Liablity from './Liablity.js';

class LiablityCards {
    constructor() {
        this.cardTemplates = [];
        this.deckSprite = null;
        this.initializeDeck();
    }

    initializeDeck() {
        this.cardTemplates.push({gold: 2, rfr: 3, texturePath: "./images/bonds1Front.jpg"});
        this.cardTemplates.push({gold: 2, rfr: 3, texturePath: "./images/bonds2Front.svg"});
    }

    async initializeAllSprites() {
        return Promise.resolve();
    }

    getRandomCard() {
        const randomIndex = Math.floor(Math.random() * this.cardTemplates.length);
        const template = this.cardTemplates[randomIndex];
        return new Liablity(template.gold, template.rfr, template.texturePath);
    }

    async initializeDeckSprite() {
        const texture = await Assets.load("./images/liabilityBack.jpg");

        this.deckSprite = new Sprite(texture);
        this.deckSprite.scale.set(0.2, 0.2);
        this.deckSprite.anchor.set(0.5);
        this.deckSprite.interactive = true;
        this.deckSprite.cursor = 'pointer';
        return this.deckSprite;
    }

    setDeckPosition(x, y) {
        if (this.deckSprite) {
            this.deckSprite.x = x;
            this.deckSprite.y = y;
        }
    }
}

export default LiablityCards;