// GameRegistryにビーチバレーの機能と表示パーツを登録
// 現時点ではリアルタイムのネット同期が重いため、まずは「1人用(相手はAI)」として実装している。
// 遊んでいる本人以外の参加者には「○○が練習中」という簡易表示だけを出し、実際のプレイ画面は
// ホスト(始めた本人)のブラウザの中だけでPhaserが動く。オンライン対戦化は後日の拡張ポイント。
GameRegistry.volleyball = {
    template: `
        <div class="volleyball-board" id="volleyball-board-area">
            <div style="text-align:center; font-size:0.8rem; color:#b4bcda;">
                ← → 移動 ／ ↑ ジャンプ　(あなたは赤、相手はAI)　5点先取で勝利
            </div>
            <div class="volleyball-stage" id="volleyball-phaser-container"></div>
            <div style="text-align:center;">
                <button class="btn btn-success" id="btn-volleyball-replay" style="display:none;"
                    onclick="GameRegistry.volleyball.restart()">もう一度プレイ</button>
                <button class="btn" style="margin-left:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>
        </div>
    `,

    phaserGame: null,

    init: function () {
        // Phaserインスタンスはページ読み込み時ではなく、hostGame()が呼ばれた時に作る
        // (裏で動かし続けて負荷をかけないため)
    },

    // ロビーの「🏐 ビーチバレー を開始」ボタンから呼ばれる
    hostGame: function () {
        gameState.isStarted = true;
        gameState.gameType = 'volleyball';
        gameState.roster = [{ accId: myAccountId, name: myName }];
        broadcastGameSync();

        document.getElementById('lobby-panel').classList.remove('active');
        document.getElementById('game-workspace').classList.add('active');
        document.getElementById('game-title-label').textContent = '🏐 ビーチバレー';
        rebuildPlayerList();
        showGameBoard('volleyball-board-area');
        this.startPhaser();
    },

    // このゲームは1人用なので、他プレイヤーからのゲーム固有メッセージは今のところ扱わない
    handleData: function (data) { },

    // gameStateの受信(SYNC_GAME)やロビー復帰のたびに呼ばれる
    syncUI: function () {
        if (!gameState.isStarted || gameState.gameType !== 'volleyball') {
            this.destroyPhaser();
            return;
        }
        document.getElementById('game-title-label').textContent = '🏐 ビーチバレー';
        showGameBoard('volleyball-board-area');

        const hostAccId = gameState.roster && gameState.roster[0] && gameState.roster[0].accId;
        if (hostAccId === myAccountId) {
            this.startPhaser();
        } else {
            // 自分は観戦側：Phaserは起動せず、簡易メッセージだけ表示する
            this.destroyPhaser();
            const container = document.getElementById('volleyball-phaser-container');
            if (container) {
                const hostName = (gameState.roster[0] && gameState.roster[0].name) || '相手';
                container.innerHTML = `<div style="padding:50px 10px; text-align:center; color:#fff; font-size:0.9rem;">
                    🏐 ${escapeHtml(hostName)} さんがビーチバレーの練習中です…</div>`;
            }
        }
    },

    restart: function () {
        const scene = this.phaserGame && this.phaserGame.scene.getScenes(true)[0];
        if (scene && typeof scene.resetMatch === 'function') scene.resetMatch();
    },

    startPhaser: function () {
        if (this.phaserGame) return; // 既に起動中

        const container = document.getElementById('volleyball-phaser-container');
        if (container) container.innerHTML = '';

        const WIDTH = 700, HEIGHT = 380;
        const GROUND_Y = 335;
        const NET_X = WIDTH / 2;
        const NET_HEIGHT = 95;
        const WIN_SCORE = 5;
        const replayBtn = document.getElementById('btn-volleyball-replay');

        function hitBall(ballObj, playerObj, direction) {
            const dx = ballObj.x - playerObj.x;
            ballObj.body.setVelocityX(direction * 250 + dx * 6);
            ballObj.body.setVelocityY(-420);
        }

        function onBallTouchGround(scene) {
            if (scene.volleyGameOver) return;
            if (scene.ball.x < NET_X) scene.score2 += 1;
            else scene.score1 += 1;
            scene.scoreText.setText(scene.score1 + ' - ' + scene.score2);

            if (scene.score1 >= WIN_SCORE || scene.score2 >= WIN_SCORE) {
                scene.volleyGameOver = true;
                scene.messageText.setText(scene.score1 > scene.score2 ? 'あなたの勝ち！ 🎉' : 'AIの勝ち！');
                scene.messageText.setVisible(true);
                scene.ball.body.setVelocity(0, 0);
                if (replayBtn) replayBtn.style.display = 'inline-block';
            } else {
                resetBall(scene);
            }
        }

        function resetBall(scene) {
            scene.ball.x = scene.servingSide === 1 ? 150 : 550;
            scene.ball.y = 130;
            scene.ball.body.setVelocity(0, 0);
            scene.servingSide = scene.servingSide === 1 ? 2 : 1;
        }

        function create() {
            const scene = this;
            scene.score1 = 0;
            scene.score2 = 0;
            scene.servingSide = 1;
            scene.volleyGameOver = false;

            scene.add.circle(600, 55, 28, 0xFFE28A);
            scene.add.rectangle(WIDTH / 2, GROUND_Y + 22, WIDTH, 44, 0xEAD3A0);
            scene.add.rectangle(WIDTH / 2, GROUND_Y + 3, WIDTH, 6, 0xD9BA7C);

            scene.add.rectangle(NET_X, GROUND_Y - NET_HEIGHT / 2, 6, NET_HEIGHT, 0xffffff, 0.9);
            scene.add.rectangle(NET_X, GROUND_Y - NET_HEIGHT, 14, 8, 0xFF6B4A);
            const netBody = scene.add.rectangle(NET_X, GROUND_Y - NET_HEIGHT / 2, 8, NET_HEIGHT, 0x000000, 0);
            scene.physics.add.existing(netBody, true);

            const groundShape = scene.add.rectangle(WIDTH / 2, GROUND_Y + 15, WIDTH, 30, 0x000000, 0);
            scene.physics.add.existing(groundShape, true);
            const groundGroup = scene.physics.add.staticGroup();
            groundGroup.add(groundShape);

            scene.player1 = scene.add.circle(140, GROUND_Y - 24, 24, 0xFF5252);
            scene.physics.add.existing(scene.player1);
            scene.player1.body.setCircle(24);
            scene.player1.body.setCollideWorldBounds(true);

            scene.player2 = scene.add.circle(560, GROUND_Y - 24, 24, 0x4A6CFF);
            scene.physics.add.existing(scene.player2);
            scene.player2.body.setCircle(24);
            scene.player2.body.setCollideWorldBounds(true);

            scene.ball = scene.add.circle(140, 140, 13, 0xffffff);
            scene.physics.add.existing(scene.ball);
            scene.ball.body.setCircle(13);
            scene.ball.body.setCollideWorldBounds(true);
            scene.ball.body.setBounce(0.75);

            scene.physics.add.collider(scene.ball, groundGroup, () => onBallTouchGround(scene));
            scene.physics.add.collider(scene.ball, netBody);
            scene.physics.add.collider(scene.player1, groundGroup);
            scene.physics.add.collider(scene.player2, groundGroup);
            scene.physics.add.collider(scene.player1, netBody);
            scene.physics.add.collider(scene.player2, netBody);
            scene.physics.add.collider(scene.ball, scene.player1, (b) => hitBall(b, scene.player1, -1));
            scene.physics.add.collider(scene.ball, scene.player2, (b) => hitBall(b, scene.player2, 1));

            scene.cursors = scene.input.keyboard.createCursorKeys();

            scene.scoreText = scene.add.text(WIDTH / 2, 12, '0 - 0', {
                fontSize: '26px', fontFamily: 'Arial', color: '#1F3A4D', fontStyle: 'bold'
            }).setOrigin(0.5, 0);

            scene.messageText = scene.add.text(WIDTH / 2, HEIGHT / 2, '', {
                fontSize: '30px', fontFamily: 'Arial', color: '#1F3A4D', fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5).setVisible(false);

            scene.resetMatch = function () {
                scene.score1 = 0;
                scene.score2 = 0;
                scene.volleyGameOver = false;
                scene.scoreText.setText('0 - 0');
                scene.messageText.setVisible(false);
                if (replayBtn) replayBtn.style.display = 'none';
                resetBall(scene);
            };
        }

        function update() {
            const scene = this;
            if (scene.volleyGameOver) {
                scene.player1.body.setVelocity(0, scene.player1.body.velocity.y);
                return;
            }

            const speed = 220;
            scene.player1.body.setVelocityX(0);
            if (scene.cursors.left.isDown) scene.player1.body.setVelocityX(-speed);
            else if (scene.cursors.right.isDown) scene.player1.body.setVelocityX(speed);
            if (scene.cursors.up.isDown && scene.player1.body.blocked.down) scene.player1.body.setVelocityY(-500);
            scene.player1.x = Phaser.Math.Clamp(scene.player1.x, 26, NET_X - 26);

            const targetX = Phaser.Math.Clamp(scene.ball.x, NET_X + 26, WIDTH - 26);
            const dx = targetX - scene.player2.x;
            scene.player2.body.setVelocityX(Phaser.Math.Clamp(dx * 4, -180, 180));
            if (scene.ball.y < 230 && Math.abs(scene.ball.x - scene.player2.x) < 85 && scene.player2.body.blocked.down) {
                scene.player2.body.setVelocityY(-480);
            }
            scene.player2.x = Phaser.Math.Clamp(scene.player2.x, NET_X + 26, WIDTH - 26);
        }

        const config = {
            type: Phaser.AUTO,
            parent: 'volleyball-phaser-container',
            width: WIDTH,
            height: HEIGHT,
            transparent: true,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            physics: { default: 'arcade', arcade: { gravity: { y: 780 }, debug: false } },
            scene: { create, update }
        };

        this.phaserGame = new Phaser.Game(config);
    },

    destroyPhaser: function () {
        if (this.phaserGame) {
            this.phaserGame.destroy(true);
            this.phaserGame = null;
        }
        const replayBtn = document.getElementById('btn-volleyball-replay');
        if (replayBtn) replayBtn.style.display = 'none';
    }
};