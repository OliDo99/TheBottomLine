import Asset from './Asset.js';
import Liablity from './Liablity.js';
class Player {
    constructor() {
        this.hand = [];
        this.playableAssets = 1;
        this.playableLiabilities = 1;
        this.charakter = null;

        this.assetList = [];
        this.cash = 0;
        this.liabilityList = [];        
        
        this.tradeCredit = 0;
        this.bankLoans = 0;
        this.bonds = 0;
        this.silver = 0;
        this.gold = 0;

        this.cardSpacing = 200;

        this.tempHand = []; 
        this.maxTempCards = 3;
        this.maxKeepCards = 2;

        this.skipNextTurn = false;
    }

    positionCardsInHand() {
        const startX = (window.innerWidth - (this.hand.length * this.cardSpacing)) / 2 
                        + this.cardSpacing / 2;
        const y = window.innerHeight - 100; 

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
        if (this.playableLiabilities <= 0) {
            return false;
        }
        const card = this.hand[cardIndex];
        if (card instanceof Liablity) {
            
            this.cash += card.gold;
            this.liabilityList.push(card);
            
            this.liabilityList.push(card);
            
            this.hand.splice(cardIndex, 1);
            this.positionCardsInHand();
            this.playableLiabilities--;

            this.moveLiabilityToPile(card);
            return true;
        }
        return false;
    }
    playAsset(cardIndex) {
        if (this.playableAssets <= 0) {
            
            return false;
        }
        const card = this.hand[cardIndex];
        if (card instanceof Asset) {
            
            if (this.cash >= card.gold) {
                
                this.cash -= card.gold;
                this.gold += card.gold;
                
                this.silver += card.silver;
               
                this.assetList.push(card);
                
                this.hand.splice(cardIndex, 1);
                this.positionCardsInHand()
                this.playableAssets--;


                this.moveAssetToPile(card);


                return true;
            } else {
                return false;
            }
        }
        return false;
    }
    moveAssetToPile(card) {
        card.sprite.x = 500-(this.assetList.length * 50);
        card.sprite.y = window.innerHeight/2;
    }
    moveLiabilityToPile(card) {
        card.sprite.x = window.innerWidth-500+(this.assetList.length * 50);
        card.sprite.y = window.innerHeight/2;
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
        const startX = (window.innerWidth - (this.tempHand.length * this.cardSpacing)) / 2 
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