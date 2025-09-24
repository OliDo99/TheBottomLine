import Asset from './Asset.js';
import Liablity from './Liablity.js';
class Player {
    constructor() {
        this.hand = [];

        this.assetList = [];
        this.cash = 0;
        this.liabilityList = [];        
        
        this.tradeCredit = 0;
        this.bankLoans = 0;
        this.bonds = 0;
        this.silver = 0;
        this.gold = 0;

        this.cardSpacing = 80;

        this.tempHand = []; 
        this.maxTempCards = 3;
        this.maxKeepCards = 2;
    }

    positionCardsInHand() {
        const startX = (window.innerWidth - (this.hand.length * this.cardSpacing)) / 2 
                        + this.cardSpacing / 2;
        const y = window.innerHeight - 80; 

        this.hand.forEach((card, index) => {
            card.setPosition(
                startX + (index * this.cardSpacing),
                y
            );
        });
    }

    addCardToHand(card) {
        this.hand.push(card);
        card.makePlayable(); // Convert card to playable mode
    }
    playLiability(cardIndex) {
        const card = this.hand[cardIndex];
        if (card instanceof Liablity) {
            // Add gold from the liability
            this.cash += card.gold;
            this.liabilityList.push(card);
            // Add to liability list
            this.liabilityList.push(card);
            // Remove from hand
            this.hand.splice(cardIndex, 1);
            this.positionCardsInHand();
            return true;
        }
        return false;
    }
    playAsset(cardIndex) {
        const card = this.hand[cardIndex];
        if (card instanceof Asset) {
            // Check if player has enough cash
            if (this.cash >= card.gold) {
                // Pay the gold cost
                this.cash -= card.gold;
                this.gold += card.gold;
                // Add silver value from the asset
                this.silver += card.silver;
                // Add to asset list
                this.assetList.push(card);
                // Remove from hand
                this.hand.splice(cardIndex, 1);
                this.positionCardsInHand()
                return true;
            } else {
                console.log('Not enough cash to play this asset!');
                return false;
            }
        }
        return false;
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

        // Add selected cards to main hand
        selectedIndices.forEach(index => {
            if (index >= 0 && index < this.tempHand.length) {
                this.addCardToHand(this.tempHand[index]);
            }
        });

        // Clear temp hand
        this.tempHand = [];
        return true;
    }

    positionTempCards() {
        const startX = (window.innerWidth - (this.tempHand.length * this.cardSpacing)) / 2 
                        + this.cardSpacing / 2;
        const y = window.innerHeight - 250; // Position above main hand

        this.tempHand.forEach((card, index) => {
            card.setPosition(
                startX + (index * this.cardSpacing),
                y
            );
        });
    }
}

export default Player;