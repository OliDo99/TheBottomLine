import { Container, Graphics, Text, Sprite, Assets, FillGradient } from 'pixi.js';
import { Input, Button } from '@pixi/ui';
import AssetCards from "./AssetCards.js";
import LiabilityCards from "./LiabilityCards.js";

class UIManager {
    constructor(app) {
        this.app = app;

        this.lobbyContainer = new Container();
        this.mainContainer = new Container();
        this.pickingContainer = new Container();
        this.characterContainer = new Container();
        this.characterCardsContainer = new Container();
        this.decksContainer = new Container();
        this.tempCardsContainer = new Container();
        this.handContainer = new Container();
        this.elseTurnContainer = new Container();

        this.statsText = new Text({
            text: '',
            style: {
                fill: '#ffffff',
                fontSize: 36,
                fontFamily: 'MyFont',
            }
        });
        this.statsText.anchor.set(0.5);
        this.statsText.position.set(window.innerWidth / 2, 30);

        this.draftOverlay = new Graphics()
            .rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: 0x000000, alpha: 0.7 });
        this.draftOverlay.visible = false;

        this._setupContainers();
    }

    _setupContainers() {
        const sprites = new Container();
        const backGroundGradient = new Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(this.getGradient());

        this.app.stage.addChild(backGroundGradient, sprites);

        this.characterContainer.addChild(this.characterCardsContainer);
        this.mainContainer.addChild(this.handContainer);
        this.pickingContainer.addChild(this.decksContainer, this.tempCardsContainer);
        this.characterContainer.addChildAt(this.draftOverlay, 0);

        sprites.addChild(
            this.characterContainer,
            this.pickingContainer,
            this.mainContainer,
            this.elseTurnContainer,
            this.lobbyContainer,
            this.statsText
        );

        this.handContainer.sortableChildren = true;
    }

    getGradient() {
        return new FillGradient({
            type: 'radial',
            center: { x: 0.5, y: 0.5 },
            innerRadius: 0.15,
            outerCenter: { x: 0.5, y: 0.5 },
            outerRadius: 0.5,
            colorStops: [
                { offset: 0, color: 0x4a4949 },
                { offset: 1, color: 0x252525 },
            ],
        });
    }

    showScreen(screenName) {
        this.lobbyContainer.visible = screenName === 'lobby';
        this.characterContainer.visible = screenName === 'character';
        this.mainContainer.visible = screenName === 'main';
        this.pickingContainer.visible = screenName === 'picking';
        this.elseTurnContainer.visible = screenName === 'elseTurn';
        this.draftOverlay.visible = screenName === 'character';
    }

    createInputBox(onEnterCallback) {
        const inputBox = new Input({
            bg: new Graphics().roundRect(0, 0, 200, 40, 5).fill(0x333333),
            padding: [10, 10, 10, 10],
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold'
            },
            placeholder: "Enter Name",
        });
        inputBox.onEnter.connect(onEnterCallback);
        inputBox.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2 - 20);
        this.lobbyContainer.addChild(inputBox);
    }

    createStartGameBox(onPressCallback) {
        const startGameButton = new Button(
            new Graphics()
                .rect(0, 0, 100, 50, 15)
                .fill(0xFFFFFF)
        );
        startGameButton.onPress.connect(onPressCallback);
        this.lobbyContainer.addChild(startGameButton.view);
    }

    createNextTurnButton(onPressCallback) {
        const buttonWidth = 150;
        const buttonHeight = 50;
        const buttonContainer = new Container();
        const background = new Graphics().roundRect(0, 0, buttonWidth, buttonHeight, 15).fill(0x473f33);
        const buttonText = new Text({ text: "End Turn", style: { fill: '#000000ff', fontSize: 20, fontFamily: 'MyFont' } });
        buttonText.anchor.set(0.5);
        buttonText.position.set(buttonWidth / 2, buttonHeight / 2);
        buttonContainer.addChild(background, buttonText);

        const nextButton = new Button(buttonContainer);
        nextButton.onPress.connect(onPressCallback);
        nextButton.view.position.set(window.innerWidth - 100 - (buttonWidth / 2), window.innerHeight - 100 - (buttonHeight / 2));
        this.mainContainer.addChild(nextButton.view);
    }

    async createAssetDeck(onPressCallback) {
        const assetDeck = new AssetCards();
        const assetDeckSprite = await assetDeck.initializeDeckSprite();
        assetDeck.setDeckPosition(window.innerWidth / 2 - 150, 70);
        assetDeckSprite.on('mousedown', onPressCallback);
        this.decksContainer.addChild(assetDeckSprite);
    }

    async createLiabilityDeck(onPressCallback) {
        const liabilityDeck = new LiabilityCards();
        const liabilityDeckSprite = await liabilityDeck.initializeDeckSprite();
        liabilityDeck.setDeckPosition(window.innerWidth / 2 + 150, 70);
        liabilityDeckSprite.on('mousedown', onPressCallback);
        this.decksContainer.addChild(liabilityDeckSprite);
    }

    displayCharacterSelection(characters, onSelectCallback) {
        this.characterCardsContainer.removeChildren();
        const spacing = 200;
        const startX = (window.innerWidth - ((characters.length - 1) * spacing)) / 2;

        characters.forEach(async (character, index) => {
            const texture = await Assets.load(character.texturePath);
            const sprite = new Sprite(texture);
            sprite.interactive = true;
            sprite.scale.set(0.3);
            sprite.anchor.set(0.5);
            sprite.x = startX + index * spacing;
            sprite.y = window.innerHeight / 2;
            sprite.on('pointerdown', () => onSelectCallback(character));
            this.characterCardsContainer.addChild(sprite);
        });
    }

    displayPlayerAssets(players, container) {
        // We should be more specific about what to remove, but for now this is ok.
        players.forEach(async (player, playerIndex) => {
            const texture = await Assets.load(player.reveal ? player.character.iconPath : "./miscellaneous/noneCharacter.png");
            const characterIcon = new Sprite(texture);
            const x = 30 + playerIndex * 60;
            characterIcon.position.set(x, 30);
            characterIcon.width = 50;
            characterIcon.height = 55.7;
            characterIcon.anchor.set(0.5);
            container.addChild(characterIcon);

            player.assetList.forEach((card, cardIndex) => {
                const rect = new Graphics()
                    .fill(card.color)
                    .roundRect(x - 20, 60 + cardIndex * 30, 20, 20, 50);
                container.addChild(rect);
            });
        });
    }

    displayRevealedCharacters(players, container) {
        const revealedPlayers = players.filter(p => p.reveal && p.character).sort((a, b) => a.character.order - b.character.order);

        revealedPlayers.forEach(async (player, index) => {
            if (!player.character) return;

            const texture = await Assets.load(player.character.texturePath);
            const characterCard = new Sprite(texture);
            const y = 50 + index * 100;
            characterCard.x = window.innerWidth - 100;
            characterCard.y = y;
            characterCard.scale.set(0.15);
            characterCard.anchor.set(0.5);
            characterCard.rotation = 90 * Math.PI / 180;
            container.addChild(characterCard);
        });
    }

    displayTempCards(player) {
        this.tempCardsContainer.removeChildren();
        const cardWidth = 590 * 0.25;
        const cardHeight = 940 * 0.25;
        const spacing = 180;
        const startX = (window.innerWidth - (player.maxTempCards * spacing)) / 2 + spacing / 2;
        const y = window.innerHeight / 2;

        for (let i = 0; i < player.maxTempCards; i++) {
            const backdrop = new Graphics()
                .roundRect(0, 0, cardWidth + 10, cardHeight + 10, 15)
                .stroke({ width: 4, color: 0xCBC28E })
                .fill({ alpha: 0 });
            backdrop.position.set(startX + (i * spacing), y);
            backdrop.pivot.set((cardWidth + 10) / 2, (cardHeight + 10) / 2);
            this.tempCardsContainer.addChild(backdrop);
        }

        player.tempHand.forEach(card => {
            this.tempCardsContainer.addChild(card.sprite);
            if (card.discardButton) this.tempCardsContainer.addChild(card.discardButton);
        });
        player.positionTempCards();
    }

    async displayOtherPlayerHand(assets, liabilities) {
        this.elseTurnContainer.removeChildren();
        const baseY = window.innerHeight - 150;
        const spacing = 60;

        const totalAssetsWidth = (assets.length - 1) * spacing;
        const assetsStartX = window.innerWidth / 2 - totalAssetsWidth - 100;
        const assetBackTexture = await Assets.load("./assets/asset_back.webp");

        for (let i = 0; i < assets.length; i++) {
            const cardBack = new Sprite(assetBackTexture);
            cardBack.scale.set(0.4);
            cardBack.anchor.set(0.5);
            cardBack.x = assetsStartX + i * spacing;
            cardBack.y = baseY;
            this.elseTurnContainer.addChild(cardBack);
        }

        const totalLiabilitiesWidth = (liabilities.length > 0 ? liabilities.length - 1 : 0) * spacing;
        const liabilitiesStartX = window.innerWidth / 2 + 100 + totalLiabilitiesWidth;
        const liabilityBackTexture = await Assets.load("liabilities/liability_back.webp");

        for (let i = 0; i < liabilities.length; i++) {
            const cardBack = new Sprite(liabilityBackTexture);
            cardBack.scale.set(0.4);
            cardBack.anchor.set(0.5);
            cardBack.x = liabilitiesStartX - i * spacing;
            cardBack.y = baseY;
            this.elseTurnContainer.addChild(cardBack);
        }
    }
}

export default UIManager;