import { Assets, Sprite } from 'pixi.js';
import Asset from './Asset.js';

class AssetCards {
    constructor() {
        this.cardTemplates = [];
        this.deckSprite = null;
        this.initializeDeck();
    }

    initializeDeck() {
        this.cardTemplates.push({gold: 1, silver: 2, texturePath: "./images/patentFront.jpg"});

        this.cardTemplates.push({gold: 5, silver: 1, texturePath: "./images/pilotPlantFront.jpg"});
        this.cardTemplates.push({gold: 3, silver: 3, texturePath: "./images/wasteManagmentFront.jpg"});
    }

    async initializeAllSprites() {
        return Promise.resolve();
    }

    getRandomCard() {
        const randomIndex = Math.floor(Math.random() * this.cardTemplates.length);
        const template = this.cardTemplates[randomIndex];
        return new Asset(template.gold, template.silver, template.texturePath);
    }

    async initializeDeckSprite() {
        const texture = await Assets.load("./images/assetBack.jpg");
        this.deckSprite = new Sprite(texture);
        this.deckSprite.scale.set(0.2);
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

export default AssetCards;