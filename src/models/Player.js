import Asset from './Asset.js';
import Liability from './Liability.js';
class Player {
    constructor(name, id) {
        this.hand = [];
        this.playableAssets = 1;
        this.playableLiabilities = 1;
        this.character = null;
        this.name = name;
        this.playerID = id;
        this.othersHand = []; 
        this.isChaiman = false;

        this.assetList = [];
        this.cash = 0;
        this.liabilityList = [];        
        
        this.tradeCredit = 0;
        this.bankLoans = 0;
        this.bonds = 0;
        this.silver = 0;
        this.gold = 0;

        this.cardSpacing = 180;

        this.tempHand = []; 
        this.maxTempCards = 3;
        this.maxKeepCards = 2;

        this.skipNextTurn = false;
        this.reveal = false;

        this._nextZIndex = 0;
    }

    positionCardsInHand() {
        const liabilities = this.hand.filter(c => c instanceof Liability).reverse();
        const assets = this.hand.filter(c => c instanceof Asset).reverse();

        const baseY = window.innerHeight - 100;
        const spacing = 60; // This is the space between each card.

        const totalAssetsWidth = (assets.length - 1) * spacing;
        const assetsStartX = window.innerWidth / 2 - totalAssetsWidth - 100;

        assets.forEach((card, i) => {
            card.setPosition(assetsStartX + i * spacing, baseY);
        });

        const totalLiabilitiesWidth = (liabilities.length > 0 ? liabilities.length - 1 : 0) * spacing;
        const liabilitiesStartX = window.innerWidth / 2 + 100 + totalLiabilitiesWidth;

        liabilities.forEach((card, i) => {
            card.setPosition(liabilitiesStartX - i * spacing, baseY);

        });
    }

    addCardToHand(card) {
        this.hand.push(card);
        card.makePlayable(); // Convert card to playable mode 
        // Assign a unique and increasing zIndex to ensure new cards are on top
        if (card.sprite) card.sprite.zIndex = this._nextZIndex++;
    }
    playLiability(cardIndex) {
        const card = this.hand[cardIndex];
        if (card instanceof Liability) {
            // Server-side logic will handle the rest.
            return true;
        }
        return false;
    }
    playAsset(cardIndex) {
        const card = this.hand[cardIndex];
        if (card instanceof Asset) {
            // Server-side logic will handle the rest.
            return true;
        }
        return false;
    }
    moveAssetToPile(card) {
        card.sprite.x = window.innerWidth / 2 - 145;
        card.sprite.y = window.innerHeight / 2 - 50;
    }
    moveLiabilityToPile(card) {
        card.sprite.x = window.innerWidth / 2 + 145;
        card.sprite.y = window.innerHeight / 2 - 50;
    }
    addCardToTempHand(card) {
        if (this.tempHand.length < this.maxTempCards) {
            this.tempHand.push(card);
            return true;
        }
        return false;
    }

    confirmCardSelection(selectedIndices) {
        if (selectedIndices.length !== this.maxKeepCards) {
            return false;
        }

        selectedIndices.forEach(index => {
            if (index >= 0 && index < this.tempHand.length) {
                this.addCardToHand(this.tempHand[index]);
            }
        });

        this.tempHand = [];
        return true;
    }

    positionTempCards() {
        const startX = (window.innerWidth - (this.maxTempCards * this.cardSpacing)) / 2 
                        + this.cardSpacing / 2;
        const y = window.innerHeight/2; 

        this.tempHand.forEach((card, index) => {
            card.setPosition(
                startX + (index * this.cardSpacing),
                y
            );
        });
   }

    useCharacterAbility(targetPlayer = null, cardIndex = null, targetCardIndex = null) {
        if (this.character && !this.character.used) {
            return this.character.useAbility(this, targetPlayer, cardIndex, targetCardIndex);
        }
        return false;
    }

    resetCharacterAbility() {
        if (this.character) {
            this.character.used = false;
        }
    }
}

export default Player;