import { Assets, Sprite } from 'pixi.js';
import Liablity from './Liablity.js';
import boardgameData from '../../boardgame.json' assert { type: 'json' };

class LiablityCards {
    constructor() {
        this.cardTemplates = [];
        this.deckSprite = null;
        this.initializeDeck();
    }

    initializeDeck() {
        const liablityCards = boardgameData.deck_list.liability_deck.card_list;        
        liablityCards.forEach(card=>{
            this.cardTemplates.push({
                title: card.title,
                gold: card.gold_value,
                texturePath: card.card_image_url
            });
        })  
    }

    async initializeAllSprites() {
        return Promise.resolve();
    }

    getRandomCard() {
        const randomIndex = Math.floor(Math.random() * this.cardTemplates.length);
        const template = this.cardTemplates[randomIndex];
        return new Liablity(template.title, template.gold, template.texturePath);
    }

    async initializeDeckSprite() {
        const texture = await Assets.load(boardgameData.deck_list.liability_deck.card_image_back_url);

        this.deckSprite = new Sprite(texture);
        this.deckSprite.scale.set(0.4);
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
