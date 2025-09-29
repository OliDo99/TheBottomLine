import GeneralCard from './GeneralCard'

class Asset extends GeneralCard{
    constructor(title, color, gold, silver, ability, texturePath) {
        super(texturePath);
        this.title = title;
        this.color = color;
        this.gold = gold;
        this.silver = silver;
        this.ability = ability || null;
    }
}

export default Asset;
