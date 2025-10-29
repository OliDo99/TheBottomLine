import GeneralCard from './GeneralCard'

class Liability extends GeneralCard {
    constructor(title, gold, texturePath) {
        super(texturePath);
        this.title = title;
        this.gold = gold;
        
    }
}

export default Liability;
