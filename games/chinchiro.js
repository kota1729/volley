// GameRegistryにチンチロ(チンチロリン)の機能と表示パーツをすべて登録
// ゲームのルール・進行・ネットワーク同期のロジックは元のバージョンと同一。
// 変更したのは「サイコロの見た目」だけで、CSSの3D transformで作っていた立方体を
// Phaserのキャンバス描画(2Dのお面切り替え+ゆれ/バウンドのtween)に置き換えている。
GameRegistry.chinchiro = {
    template: `
        <div class="chinchiro-board" id="chinchiro-board-area">
            <div class="spectator-banner" id="chinchiro-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <div class="winner-overlay" id="chinchiro-winner-overlay" style="display:none;">
                <div class="winner-trophy">🏆</div>
                <div class="winner-name" id="chinchiro-winner-name">優勝！</div>
                <div class="winner-card-info" id="chinchiro-winner-hand">役: -</div>
                <div id="chinchiro-final-ranking" style="margin-top:14px; width:100%; display:flex; flex-direction:column; gap:6px;"></div>
                <button class="btn btn-success" style="margin-top:14px;" onclick="GameRegistry.chinchiro.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="chinchiro-playing-area">
                <div class="direction-indicator" id="chinchiro-turn-indicator">現在の番: -</div>

                <div class="dice-stage" id="chinchiro-dice-stage">
                    <div class="chinchiro-dish">
                        <div id="chinchiro-phaser-container" style="position:absolute; inset:8px; border-radius:50%; overflow:hidden;"></div>
                        <div class="chinchiro-pinzoro-flash" id="chinchiro-pinzoro-flash"><span>🔥 ピンゾロ！！ 🔥</span></div>
                    </div>
                </div>
                <div style="text-align:center; font-size:0.85rem; color:var(--accent-color); font-weight:bold; min-height:1.2em;" id="chinchiro-current-hand-label"></div>

                <div class="action-container">
                    <button class="btn btn-success" id="btn-chinchiro-roll" onclick="GameRegistry.chinchiro.rollDice()" disabled>🎲 サイコロを振る</button>
                </div>

                <div class="hand-section" style="margin-top:10px;">
                    <div class="hand-title"><span>プレイヤー状況</span></div>
                    <div class="chinchiro-scoreboard" id="chinchiro-scoreboard"></div>
                </div>

                <details class="chinchiro-rules">
                    <summary>📖 チンチロのルールを見る</summary>
                    <div class="rules-body">
                        <h4>遊び方</h4>
                        <ol>
                            <li>順番に一人ずつ、お皿の中でサイコロ3個を振ります。</li>
                            <li>役ができなかった場合、<strong>最大3回まで</strong>振り直せます（3回とも役なしなら「役なし」で確定し、次の人に交代）。</li>
                            <li>役ができたら、その時点で自分の番は終わり、次の人に交代します。</li>
                            <li>全員が振り終えたら、一番強い役を出した人（同じ強さなら複数人）が優勝です！</li>
                        </ol>
                        <h4>役の強さ（強い順）</h4>
                        <div class="rules-hand-row"><span>① ピンゾロ</span><span>1-1-1（最強）</span></div>
                        <div class="rules-hand-row"><span>② ゾロ目</span><span>2〜6の三つ揃い</span></div>
                        <div class="rules-hand-row"><span>③ シゴロ</span><span>4-5-6</span></div>
                        <div class="rules-hand-row"><span>④ ○の目</span><span>2個同じ目＋残り1個 (例:5-5-2)。ペアの数字が大きいほど強い</span></div>
                        <div class="rules-hand-row"><span>⑤ ヒフミ</span><span>1-2-3（弱い役）</span></div>
                        <div class="rules-hand-row"><span>⑥ 役なし</span><span>3回振っても役が揃わなかった場合（最弱）</span></div>
                    </div>
                </details>
            </div>
        </div>
    `,

    isRolling: false,
    rollAnimTimer: null,
    rollingInterval: null,
    diceScene: null,
    phaserGame: null,

    // 3x3グリッド(1〜9)のうち、どの位置に目(ピップ)を置くか
    PIP_LAYOUT: {
        1: [5],
        2: [1, 9],
        3: [1, 5, 9],
        4: [1, 3, 7, 9],
        5: [1, 3, 5, 7, 9],
        6: [1, 3, 4, 6, 7, 9]
    },

    init: function () {
        this.isRolling = false;
        this.rollAnimTimer = null;
        this.rollingInterval = null;
        this.buildPhaserDice();
    },

    // Phaserで「お皿の中の3個のサイコロ」をまとめて構築する。ページ読み込み時に1度だけ作り、
    // 以後はロビーとゲーム画面を行き来してもこのインスタンスを使い回す(軽量なので破棄不要)
    buildPhaserDice: function () {
        const self = this;
        const container = document.getElementById('chinchiro-phaser-container');
        if (!container || typeof Phaser === 'undefined') return;

        const WIDTH = 280, HEIGHT = 180;
        const DIE_SIZE = 62;
        const positions = [
            { x: 96, y: 118, rot: -8 },
            { x: 150, y: 66, rot: 4 },
            { x: 206, y: 118, rot: 10 }
        ];

        function buildFace(scene, n, size) {
            const c = scene.add.container(0, 0);
            const g = scene.add.graphics();
            g.fillStyle(0xf2f2f2, 1);
            g.fillRoundedRect(-size / 2, -size / 2, size, size, 9);
            g.lineStyle(3, 0x3b4260, 1);
            g.strokeRoundedRect(-size / 2, -size / 2, size, size, 9);
            c.add(g);
            const layout = self.PIP_LAYOUT[n];
            const gridPos = { 1: [-1, -1], 2: [0, -1], 3: [1, -1], 4: [-1, 0], 5: [0, 0], 6: [1, 0], 7: [-1, 1], 8: [0, 1], 9: [1, 1] };
            const gap = size / 3.3;
            const pipColor = (n === 1) ? 0xd81f2a : 0x222222;
            layout.forEach(pos => {
                const [gx, gy] = gridPos[pos];
                const pip = scene.add.circle(gx * gap, gy * gap, size * 0.095, pipColor);
                c.add(pip);
            });
            return c;
        }

        function create() {
            const scene = this;
            scene.dice = [];
            positions.forEach((pos, i) => {
                const root = scene.add.container(pos.x, pos.y);
                root.setAngle(pos.rot);
                const faces = {};
                for (let n = 1; n <= 6; n++) {
                    const f = buildFace(scene, n, DIE_SIZE);
                    f.setVisible(false);
                    root.add(f);
                    faces[n] = f;
                }
                const placeholder = scene.add.text(0, 0, '-', { fontSize: '30px', fontFamily: 'Arial', color: '#6b6b6b' }).setOrigin(0.5);
                root.add(placeholder);
                scene.dice.push({ root, faces, placeholder, baseRot: pos.rot, currentFace: null });
            });

            scene.showUnrolled = function (i) {
                const d = scene.dice[i];
                if (!d) return;
                Object.values(d.faces).forEach(f => f.setVisible(false));
                d.placeholder.setVisible(true);
                d.currentFace = null;
            };

            scene.showFace = function (i, n, animateLanding) {
                const d = scene.dice[i];
                if (!d) return;
                n = Math.max(1, Math.min(6, n));
                Object.values(d.faces).forEach(f => f.setVisible(false));
                d.placeholder.setVisible(false);
                d.faces[n].setVisible(true);
                d.currentFace = n;
                if (animateLanding) {
                    d.root.setScale(1);
                    scene.tweens.add({ targets: d.root, scaleX: 1.16, scaleY: 1.16, duration: 130, yoyo: true, ease: 'Quad.Out' });
                }
            };

            scene.startRolling = function () {
                scene.dice.forEach(d => {
                    scene.tweens.add({ targets: d.root, angle: d.baseRot + 14, duration: 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
                });
            };

            scene.stopRolling = function () {
                scene.dice.forEach(d => {
                    scene.tweens.killTweensOf(d.root);
                    d.root.setAngle(d.baseRot);
                    d.root.setScale(1);
                });
            };

            // 初期状態は全部「未挑戦(-)」
            scene.dice.forEach((d, i) => scene.showUnrolled(i));
        }

        const config = {
            type: Phaser.AUTO,
            parent: 'chinchiro-phaser-container',
            width: WIDTH,
            height: HEIGHT,
            transparent: true,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            scene: { create }
        };

        this.phaserGame = new Phaser.Game(config);
        this.phaserGame.events.once('ready', () => {
            this.diceScene = this.phaserGame.scene.getScenes(true)[0];
        });
    },

    // UNOのDraw2/4のようなリアルタイム系イベント。他プレイヤーへ「振っている最中」の演出を伝える
    handleData: function (data) {
        if (data.type === 'CHINCHIRO_ROLLING') {
            this.playRollingAnimation();
        }
    },

    diceFace: function (n) {
        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return faces[Math.max(1, Math.min(6, n)) - 1];
    },

    // 3つのサイコロの目から役を判定する
    judgeDice: function (dice) {
        const sorted = [...dice].sort((a, b) => a - b);
        const [a, b, c] = sorted;

        if (a === b && b === c) {
            if (a === 1) return { label: 'ピンゾロ (1-1-1)', tier: 6, score: 1000 };
            return { label: `ゾロ目 (${a}-${a}-${a})`, tier: 5, score: 900 + a };
        }
        if (a === 1 && b === 2 && c === 3) return { label: 'ヒフミ (1-2-3)', tier: 1, score: 10 };
        if (a === 4 && b === 5 && c === 6) return { label: 'シゴロ (4-5-6)', tier: 4, score: 800 };
        if (a === b || b === c) {
            const oddVal = (a === b) ? c : a;
            return { label: `${oddVal}の目`, tier: 3, score: 100 + oddVal * 10 };
        }
        return { label: '目なし', tier: 0, score: -1 };
    },

    hostGame: function () {
        if (sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
        gameState.isStarted = true; gameState.gameType = 'chinchiro';
        let roster = shufflePlayers(sortedPlayers.map(p => ({ accId: p.accId, name: p.name })));
        const startIdx = Math.floor(Math.random() * roster.length);
        roster = roster.slice(startIdx).concat(roster.slice(0, startIdx));
        gameState.roster = roster;
        gameState.turnIndex = 0;
        gameState.chinchiroResults = {};
        gameState.roster.forEach(p => {
            gameState.chinchiroResults[p.accId] = { dice: [1, 1, 1], attempts: 0, label: '-', tier: -1, score: -1, done: false };
        });
        gameState.isEnded = false; gameState.winner = null; gameState.winnerHandText = '';
        this.isRolling = false;

        broadcastGameSync();
        syncGameUI();
    },

    rollDice: function () {
        const activePlayer = getActivePlayer();
        if (!activePlayer || activePlayer.accId !== myAccountId) return;
        if (this.isRolling) return;
        const myResult = gameState.chinchiroResults[myAccountId];
        if (!myResult || myResult.done) return;

        this.isRolling = true;
        const rollBtn = document.getElementById('btn-chinchiro-roll');
        if (rollBtn) rollBtn.disabled = true;

        broadcast({ type: 'CHINCHIRO_ROLLING' });
        this.playRollingAnimation();

        if (this.rollAnimTimer) clearTimeout(this.rollAnimTimer);
        this.rollAnimTimer = setTimeout(() => { this.finalizeRoll(); }, 900);
    },

    playRollingAnimation: function () {
        const scene = this.diceScene;
        if (!scene) return;
        scene.startRolling();

        if (this.rollingInterval) clearInterval(this.rollingInterval);
        this.rollingInterval = setInterval(() => {
            [0, 1, 2].forEach(i => scene.showFace(i, 1 + Math.floor(Math.random() * 6), false));
        }, 90);

        setTimeout(() => {
            if (this.rollingInterval) { clearInterval(this.rollingInterval); this.rollingInterval = null; }
            scene.stopRolling();
        }, 850);
    },

    finalizeRoll: function () {
        const myResult = gameState.chinchiroResults[myAccountId];
        if (!myResult) { this.isRolling = false; return; }

        const dice = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
        const judged = this.judgeDice(dice);

        const commit = () => {
            myResult.attempts += 1;
            myResult.dice = dice;

            if (judged.tier > 0) {
                myResult.label = judged.label; myResult.tier = judged.tier; myResult.score = judged.score; myResult.done = true;
                this.advanceTurn();
            } else if (myResult.attempts >= 3) {
                myResult.label = '目なし（役なし・最下位確定）'; myResult.tier = 0; myResult.score = 0; myResult.done = true;
                this.advanceTurn();
            } else {
                myResult.label = `役なし（あと${3 - myResult.attempts}回振り直せます）`; myResult.tier = -1; myResult.score = -1;
            }

            this.isRolling = false;
            broadcastGameSync();
            syncGameUI();
        };

        if (judged.tier === 6) {
            // ピンゾロが出た時は、すぐに結果を確定せず「出た瞬間」をしっかり見せてから確定する
            this.showDiceResult(dice);
            this.showPinzoroFlash();
            setTimeout(commit, 1400);
        } else {
            commit();
        }
    },

    // ピンゾロ演出中に実際の出目をお皿に表示する
    showDiceResult: function (dice) {
        const scene = this.diceScene;
        if (!scene) return;
        [0, 1, 2].forEach(i => scene.showFace(i, dice[i], true));
    },

    showPinzoroFlash: function () {
        const flash = document.getElementById('chinchiro-pinzoro-flash');
        if (!flash) return;
        flash.style.display = 'flex';
        const span = flash.querySelector('span');
        if (span) {
            const clone = span.cloneNode(true);
            span.replaceWith(clone);
        }
        setTimeout(() => { flash.style.display = 'none'; }, 1350);
    },

    advanceTurn: function () {
        gameState.turnIndex += 1;
        if (gameState.turnIndex >= gameState.roster.length) {
            this.finishGame();
        }
    },

    finishGame: function () {
        let maxScore = -1;
        gameState.roster.forEach(p => {
            const r = gameState.chinchiroResults[p.accId];
            if (r && r.score > maxScore) maxScore = r.score;
        });
        const winners = gameState.roster.filter(p => gameState.chinchiroResults[p.accId] && gameState.chinchiroResults[p.accId].score === maxScore);
        gameState.isEnded = true;
        gameState.winner = winners.map(p => p.name).join('・');
        gameState.winnerHandText = winners.length ? gameState.chinchiroResults[winners[0].accId].label : '-';
    },

    renderScoreboard: function () {
        const wrapper = document.getElementById('chinchiro-scoreboard');
        if (!wrapper) return;
        wrapper.innerHTML = "";

        gameState.roster.forEach((p, idx) => {
            const r = gameState.chinchiroResults[p.accId] || { dice: [], attempts: 0, label: '-', done: false };
            const isTurn = (!gameState.isEnded && idx === gameState.turnIndex);
            const row = document.createElement('div');
            row.className = `chinchiro-score-row ${isTurn ? 'active-turn' : ''} ${r.done ? 'finished' : ''}`;

            let diceHtml = '<span style="color:#666; font-size:0.72rem;">未挑戦</span>';
            if (r.attempts > 0) {
                diceHtml = `<div class="chinchiro-mini-dice">${r.dice.map(d => `<div class="chinchiro-mini-die ${d === 1 ? 'die-one' : ''}">${this.diceFace(d)}</div>`).join('')}</div>`;
            }

            const statusLabel = r.attempts > 0 ? r.label : (idx < gameState.turnIndex ? r.label : '順番待ち');

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span style="font-weight:bold; ${p.accId === myAccountId ? 'color:var(--accent-color);' : ''}">${escapeHtml(p.name)}${isTurn ? ' 🎲' : ''}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${diceHtml}
                    <span class="chinchiro-hand-label">${statusLabel}</span>
                </div>
            `;
            wrapper.appendChild(row);
        });
    },

    renderFinalRanking: function () {
        const wrap = document.getElementById('chinchiro-final-ranking');
        if (!wrap) return;
        const ranked = [...gameState.roster].sort((a, b) => {
            const sa = gameState.chinchiroResults[a.accId] ? gameState.chinchiroResults[a.accId].score : 0;
            const sb = gameState.chinchiroResults[b.accId] ? gameState.chinchiroResults[b.accId].score : 0;
            return sb - sa;
        });
        wrap.innerHTML = ranked.map((p, i) => {
            const r = gameState.chinchiroResults[p.accId] || {};
            const diceArr = r.dice || [];
            return `<div class="chinchiro-score-row ${i === 0 ? 'finished' : ''}">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="chinchiro-rank-num">${i + 1}位</span>
                    <span style="font-weight:bold;">${escapeHtml(p.name)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="chinchiro-mini-dice">${diceArr.map(d => `<div class="chinchiro-mini-die ${d === 1 ? 'die-one' : ''}">${this.diceFace(d)}</div>`).join('')}</div>
                    <span class="chinchiro-hand-label">${r.label || '-'}</span>
                </div>
            </div>`;
        }).join('');
    },

    syncUI: function () {
        document.getElementById('game-title-label').textContent = "チンチロリン";
        showGameBoard('chinchiro-board-area');

        const activePlayer = getActivePlayer();
        const isMyTurn = (activePlayer && activePlayer.accId === myAccountId);
        const amInRoster = !gameState.roster || !gameState.roster.length || gameState.roster.some(p => p.accId === myAccountId);
        document.getElementById('chinchiro-spectator-banner').style.display = (!amInRoster && !gameState.isEnded) ? 'block' : 'none';

        const infoBar = document.getElementById('game-info');

        if (gameState.isEnded) {
            this.rollAnimTimer && clearTimeout(this.rollAnimTimer);
            document.getElementById('chinchiro-winner-overlay').style.display = 'flex';
            document.getElementById('chinchiro-playing-area').style.display = 'none';
            document.getElementById('chinchiro-winner-name').textContent = `${gameState.winner} 優勝！`;
            document.getElementById('chinchiro-winner-hand').textContent = `役: ${gameState.winnerHandText || '-'}`;
            this.renderFinalRanking();
            infoBar.textContent = `🎉 ${gameState.winner}さんが [${gameState.winnerHandText}] で優勝しました！`;
            return;
        }

        document.getElementById('chinchiro-winner-overlay').style.display = 'none';
        document.getElementById('chinchiro-playing-area').style.display = 'block';

        document.getElementById('chinchiro-turn-indicator').textContent =
            `現在の番: ${activePlayer ? activePlayer.name : '-'} さん (${gameState.turnIndex + 1}人目 / 全${gameState.roster.length}人)`;

        const myResult = gameState.chinchiroResults[myAccountId];
        const handLabelEl = document.getElementById('chinchiro-current-hand-label');
        const rollBtn = document.getElementById('btn-chinchiro-roll');

        if (!this.isRolling && this.diceScene) {
            const activeResult = activePlayer ? gameState.chinchiroResults[activePlayer.accId] : null;
            const diceToShow = activeResult ? activeResult.dice : [1, 1, 1];
            const attemptsForDisplay = activeResult ? activeResult.attempts : 0;
            [0, 1, 2].forEach(i => {
                if (attemptsForDisplay > 0) {
                    this.diceScene.showFace(i, diceToShow[i], false);
                } else {
                    this.diceScene.showUnrolled(i);
                }
            });
            handLabelEl.textContent = (activeResult && activeResult.attempts > 0) ? activeResult.label : '';
        }

        if (isMyTurn && myResult && !myResult.done && !this.isRolling) {
            rollBtn.disabled = false;
            rollBtn.textContent = myResult.attempts === 0 ? '🎲 サイコロを振る' : `🎲 もう一度振る (${myResult.attempts + 1}/3回目)`;
        } else {
            rollBtn.disabled = true;
            rollBtn.textContent = '🎲 サイコロを振る';
        }

        if (isMyTurn && this.isRolling) {
            infoBar.textContent = "🎲 サイコロが転がっています…！";
        } else if (!amInRoster) {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...(観戦中)`;
        } else if (isMyTurn) {
            infoBar.textContent = (myResult && myResult.attempts > 0)
                ? "役が揃いませんでした。もう一度サイコロを振ってください。"
                : "🎲 あなたの番です！サイコロを振ってください。";
        } else {
            infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...`;
        }

        this.renderScoreboard();
    }
};