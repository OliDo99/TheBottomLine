import { Assets, Sprite } from 'pixi.js';

class Liablity {
    constructor(title, gold, texturePath) {
        this.title = title;
        this.gold = gold;
        this.texturePath = texturePath;
        this.sprite = null;
        this.initializeSprite();
    }

    async initializeSprite() {
        const texture = await Assets.load(this.texturePath);
        this.sprite = new Sprite(texture);
        this.sprite.scale.set(0.2);
        //this.sprite.width = 140; 
        //this.sprite.height = 200;
        this.sprite.anchor.set(0.5);
        this.makeCardDraggable();
    }
    makeCardDraggable() {
        const DISCARD_THRESHOLD = 150;
        this.sprite.interactive = true;
        this.sprite.dragging = false;
        this.sprite.startPosition = { x: 0, y: 0 };

        this.dragListeners = {
            mousedown: (event) => {
                this.sprite.dragging = true;
                this.sprite.startPosition = { x: this.sprite.x, y: this.sprite.y };
            },
            mousemove: (event) => {
                if (this.sprite.dragging) {
                    const newPosition = event.global;
                    this.sprite.x = newPosition.x;
                    this.sprite.y = newPosition.y;
                }
            },
            mouseup: () => {
                if (this.sprite.dragging) {
                    const distanceX = Math.abs(this.sprite.x - this.sprite.startPosition.x);
                    const distanceY = Math.abs(this.sprite.y - this.sprite.startPosition.y);
                    if (distanceX > DISCARD_THRESHOLD || distanceY > DISCARD_THRESHOLD) {
                        this.sprite.emit('cardDiscarded', this);
                    } else {
                        this.sprite.x = this.sprite.startPosition.x;
                        this.sprite.y = this.sprite.startPosition.y;
                    }
                }
                this.sprite.dragging = false;
            }
        };

        this.sprite.on('mousedown', this.dragListeners.mousedown);
        this.sprite.on('mousemove', this.dragListeners.mousemove);
        this.sprite.on('mouseup', this.dragListeners.mouseup);
    }

    makePlayable() {
        // Remove drag listeners
        this.sprite.off('mousedown', this.dragListeners.mousedown);
        this.sprite.off('mousemove', this.dragListeners.mousemove);
        this.sprite.off('mouseup', this.dragListeners.mouseup);

        // Add play functionality
        this.sprite.interactive = true;
        this.sprite.cursor = 'pointer';
        this.sprite.on('mousedown', () => {
            this.sprite.emit('cardPlayed', this);
            console.log('Liability card played:', this);
        });
    }

    setPosition(x, y) {
        if (this.sprite) {
            this.sprite.x = x;
            this.sprite.y = y;
        }
    }

}

export default Liablity;
