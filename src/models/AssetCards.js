import { Assets, Sprite } from 'pixi.js';
import Asset from './Asset.js';
import boardgameData from '../../boardgame.json' assert { type: 'json' };
class AssetCards {
    constructor() {
        this.cardTemplates = [];
        this.deckSprite = null;
        this.initializeDeck();
    }

    initializeDeck() {
        const assetCards = boardgameData.deck_list.asset_deck.card_list;        
        assetCards.forEach(card=>{
            this.cardTemplates.push({
                title: card.title,
                color: card.color,
                gold: card.gold_value,
                silver: card.silver_value,
                ability: card.ability,
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
        return new Asset( template.title, template.color, template.gold, template.silver, template.ability, template.texturePath );
    }

    async initializeDeckSprite() {
        const texture = await Assets.load(boardgameData.deck_list.asset_deck.card_image_back_url);

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