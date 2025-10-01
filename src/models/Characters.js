class Character {
    constructor(name, ability, description) {
        this.name = name;
        this.ability = ability;
        this.description = description;
        
        this.texturePath = `./miscellaneous/${name}.webp`;
        this.used = false; 
    }

    useActive(player, targetPlayer = null) {
        if (this.used) return false;
        this.used = true;
        return true;
    }
    usePassive(player) {
        player.gold += 1;
        console.log(`${player.charakter.name}: usePassive`);

    }
}

export class Shareholder extends Character {
    constructor() {
        super(
            "shareholder",
            "Skip Master",
            "Can choose a character and skip their turn"
        );
    }

    useActive(player, targetPlayer) {
        if (super.useActive(player)) {
            targetPlayer.skipNextTurn = true;
            return true;
        }
        return false;
    }
   
}

export class Banker extends Character {
    constructor() {
        super(
            "banker",
            "Fanum Tax",
            "Takes gold from a player based on their asset colors"
        );
    }

    useActive(player, targetPlayer) {
        if (super.useActive(player)) {
            const uniqueColors = new Set(targetPlayer.assetList.map(asset => asset.color));
            const goldToTake = uniqueColors.size;
            targetPlayer.gold -= goldToTake;
            player.gold += goldToTake;
            return true;
        }
        return false;
    }
    
}

export class Regulator extends Character {
    constructor() {
        super(
            "regulator",
            "Card Swap",
            "Can swap cards with another player"
        );
    }

    useActive(player, targetPlayer, cardIndex, targetCardIndex) {
        if (super.useActive(player)) {
            const tempCard = player.hand[cardIndex];
            player.hand[cardIndex] = targetPlayer.hand[targetCardIndex];
            targetPlayer.hand[targetCardIndex] = tempCard;
            player.positionCardsInHand();
            targetPlayer.positionCardsInHand();
            return true;
        }
        return false;
    }
   
}

export class CEO extends Character {
    constructor() {
        super(
            "ceo",
            "Asset Master",
            "Starts with 3 playable assets per turn"
        );
    }

    // Applied at start, no active ability needed
    useActive(player) {
        if (super.useActive(player)) {
            return true; // Keep ability used tracking but do nothing
        }
        return false;
    }

    // New method to apply passive effect
    usePassive(player) {
        super.usePassive(player);
        player.playableAssets = 3;
            
        
        
        
    }
}

export class CFO extends Character {
    constructor() {
        super(
            "cfo",
            "Liability Master",
            "Starts with 3 playable liabilities per turn"
        );
    }

    useActive(player) {
        if (super.useActive(player)) {
            return true;
        }
        return false;
    }

    usePassive(player) {
        super.usePassive(player);
        player.playableLiabilities = 3;
        
    }
}

export class CSO extends Character {
    constructor() {
        super(
            "cso",
            "Strategic Master",
            "You can buy up to two assets if they are green or red"
        );
    }   

    useActive(player) {
        if (super.useActive(player)) {
            return true;
        }
        return false;
    }

    usePassive(player) {
        super.usePassive(player);
            player.playableAssets = 2;
    }
}

export class HeadOfRD extends Character {
    constructor() {
        super(
            "headOfR&D",
            "Research Master",
            "Starts with increased card draw and keep limit"
        );
    }

    useActive(player) {
        if (super.useActive(player)) {
            return true;
        }
        return false;
    }

    usePassive(player) {
        super.usePassive(player);
        player.maxTempCards = 6;
        player.maxKeepCards = 3;
        
    }
}

export class Stakeholder extends Character {
    constructor() {
        super(
            "stakeholder",
            "Forced Sale",
            "Can force a player to sell an asset"
        );
    }

    useActive(player, targetPlayer, assetIndex) {
        if (super.useActive(player)) {
            const asset = targetPlayer.assetList[assetIndex];
            if (asset) {
                targetPlayer.assetList.splice(assetIndex, 1);
                targetPlayer.cash += asset.gold;
                return true;
            }
            return false;
        }
        return false;
    }
    usePassive(player) {
        if (super.usePassive(player)) {
            return true; // Keep ability used tracking but do nothing
        }
        return false;
    }
}

// Export a function to get all characters
export function getAllCharacters() {
    return [
        new Shareholder(),
        new Banker(),
        new Regulator(),
        new CEO(),
        new CFO(),
        new CSO(),
        new HeadOfRD(),
        new Stakeholder()
    ];
}