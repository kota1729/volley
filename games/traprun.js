// 「トラップランナー」— 罠を置き合いながらゴールを目指す、オリジナルの対戦ミニゲーム。
// ジャンルとしては「みんなでステージに罠を置いていき、自分だけ切り抜けられるように
// 仕込む」系の対戦アクションから着想を得ていますが、ステージ・見た目・ルールの数値は
// すべてこのサイト独自に作った、既存の特定タイトルのコピーではないオリジナル実装です。
//
// 基本ルール:
//   1. 【設置フェーズ】プレイヤーが順番に1手ずつ、共有のステージに「穴」「トゲ」
//      「バネ」を置いたり、床に修復したりする(1ラウンドにつき1人2手)。
//   2. 【実行フェーズ】設置が終わったら、1人ずつ順番に自分のキャラを操作してゴールを
//      目指す。キャラは常に一定speedで自動的に前進し続けるので、プレイヤーは
//      「ジャンプ」ボタンをタイミングよく押して穴やトゲを避ける。
//   3. ゴールできれば1点、さらに「自分は成功したのに他の誰かが脱落した」場合は
//      ボーナスで+1点。ラウンドを重ねて、最終的に合計点が一番高い人が優勝。
//
// ネットワーク設計のメモ:
//   実行フェーズは「今まさに走っている本人のクライアントだけ」がジャンプ入力を処理し、
//   成功/失敗が確定した瞬間に結果(gameState.trap.results)を更新してbroadcastGameSync()
//   する、という一人ずつのリレー形式にしてある。これにより、複数人が同時に動く物理演算を
//   ネットワーク越しに同期する必要がなく、既存のUNO/チンチロと同じ「行動した人が
//   ローカルで状態を進めてから全員に配る」というこのサイトの設計にそのまま馴染む。
//   トレードオフとして、自分の番以外の人が走っている様子はリアルタイムには動かず、
//   結果が出た瞬間にゴール/脱落した位置へ表示が切り替わる(＝観戦中はやや静的)。
//   ここは今後の改善余地として残っている。

if (typeof document !== 'undefined' && !document.getElementById('traprun-custom-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'traprun-custom-styles';
    styleEl.innerHTML = `
        .traprun-board { display: none; flex-direction: column; gap: 10px; min-width: 0; }
        .traprun-board.active { display: flex; }

        .traprun-phase-banner { text-align:center; font-size:0.82rem; font-weight:bold; color: var(--accent-color); min-height: 1.3em; }

        .traprun-stage-wrap { position: relative; background: linear-gradient(180deg, #1a2035 0%, #0b0d16 100%); border-radius: 10px; padding: 14px 6px 30px 6px; overflow-x: auto; }
        .traprun-track { display:flex; position:relative; z-index:1; }
        .traprun-tile {
            flex: 1 1 0; min-width: 30px; height: 44px; margin: 0 1px; border-radius: 4px;
            display:flex; align-items:center; justify-content:center; font-size:1.05rem;
            background:#3a4160; border-bottom: 4px solid #262c47; position:relative;
            transition: background .15s ease, transform .1s ease;
        }
        .traprun-tile.start { background: #2ecc71; border-bottom-color:#1c9955; }
        .traprun-tile.goal { background: #ffd54f; border-bottom-color:#c9a53a; }
        .traprun-tile.GAP { background: transparent; border-bottom: 4px dashed #555; }
        .traprun-tile.SPIKE { background: #7a2020; border-bottom-color:#4a1010; }
        .traprun-tile.SPRING { background: #2a6f8f; border-bottom-color:#184a5f; }
        .traprun-tile.editable { cursor:pointer; box-shadow: inset 0 0 0 2px rgba(0,255,242,0.5); }
        .traprun-tile.editable:hover { transform: translateY(-3px); }

        .traprun-runner-layer { position:absolute; left:6px; right:6px; top:12px; bottom:30px; pointer-events:none; z-index:2; }
        .traprun-runner-token {
            position:absolute; bottom:0; width:24px; height:24px; margin-left:-12px; border-radius:50%;
            display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:900; color:#fff;
            background:#555; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.5);
            transition: left 0.12s linear; --jump-duration: 900ms;
        }
        .traprun-runner-token.me { background:#8e44ad; box-shadow:0 0 0 3px var(--accent-color), 0 2px 6px rgba(0,0,0,0.5); }
        .traprun-runner-token.dead { opacity:0.35; filter:grayscale(1); }
        .traprun-runner-token.jumping { animation: traprun-jump-arc var(--jump-duration) ease-in-out; }
        @keyframes traprun-jump-arc { 0% { transform: translateY(0); } 50% { transform: translateY(-32px); } 100% { transform: translateY(0); } }

        .traprun-toolbar { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; }
        .traprun-tool-btn { background: var(--panel-light); color: var(--text-white); border:2px solid transparent; padding:8px 10px; border-radius:8px; font-size:0.78rem; font-weight:bold; cursor:pointer; }
        .traprun-tool-btn.active { border-color: var(--accent-color); background:#12283a; }
        .traprun-tool-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .traprun-result-row { display:flex; justify-content:space-between; align-items:center; background:#0b0d16; border-radius:8px; padding:7px 10px; font-size:0.78rem; margin-bottom:4px; border-left: 4px solid #555; gap:8px; }
        .traprun-result-row.success { border-left-color: var(--success-color); }
        .traprun-result-row.fail { border-left-color: var(--danger-color); }
    `;
    document.head.appendChild(styleEl);
}

GameRegistry.traprun = {
    template: `
        <div class="traprun-board" id="traprun-board-area">
            <div class="spectator-banner" id="traprun-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <div class="winner-overlay" id="traprun-winner-overlay" style="display:none;">
                <div class="winner-trophy">🏆</div>
                <div class="winner-name" id="traprun-winner-name">優勝！</div>
                <div class="winner-card-info" id="traprun-winner-score">-</div>
                <div id="traprun-final-ranking" style="margin-top:14px; width:100%; display:flex; flex-direction:column; gap:6px;"></div>
                <button class="btn btn-success" style="margin-top:14px;" onclick="GameRegistry.traprun.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="traprun-playing-area">
                <div class="direction-indicator" id="traprun-round-indicator">ラウンド 1</div>
                <div class="traprun-phase-banner" id="traprun-phase-banner"></div>

                <div class="traprun-stage-wrap">
                    <div class="traprun-track" id="traprun-track"></div>
                    <div class="traprun-runner-layer" id="traprun-runner-layer"></div>
                </div>

                <div class="action-container" id="traprun-run-action" style="display:none;">
                    <button class="btn btn-success" onclick="GameRegistry.traprun.jump()">⬆️ ジャンプ！(スペースキーでもOK)</button>
                </div>

                <div class="traprun-toolbar" id="traprun-toolbar">
                    <button class="traprun-tool-btn" data-tool="GAP" onclick="GameRegistry.traprun.selectTool('GAP')">🕳️ 穴</button>
                    <button class="traprun-tool-btn" data-tool="SPIKE" onclick="GameRegistry.traprun.selectTool('SPIKE')">📌 トゲ</button>
                    <button class="traprun-tool-btn" data-tool="SPRING" onclick="GameRegistry.traprun.selectTool('SPRING')">🌀 バネ</button>
                    <button class="traprun-tool-btn" data-tool="FLOOR" onclick="GameRegistry.traprun.selectTool('FLOOR')">🧹 修復</button>
                </div>

                <div class="hand-section" style="margin-top:6px;">
                    <div class="hand-title"><span>ラウンド結果</span></div>
                    <div id="traprun-round-result-list" style="font-size:0.8rem; color:#ccc;"></div>
                    <div class="action-container" id="traprun-next-round-action" style="display:none;">
                        <button class="btn btn-success" onclick="GameRegistry.traprun.nextRound()">▶ 次のラウンドへ</button>
                    </div>
                </div>

                <details class="chinchiro-rules">
                    <summary>📖 トラップランナーのルールを見る</summary>
                    <div class="rules-body">
                        <h4>遊び方</h4>
                        <ol>
                            <li>【設置フェーズ】1人2手ずつ、順番に「穴」「トゲ」「バネ」をステージに置くか、床に修復します。スタートとゴールのマスは変更できません。</li>
                            <li>【実行フェーズ】設置が終わったら1人ずつ、キャラが自動で前進する中「ジャンプ」ボタンでタイミングよく跳んで穴やトゲを避け、ゴールを目指します。</li>
                            <li>ジャンプは連続する1マス分の障害物をだいたい避けられますが、2マス連続で置かれた障害物は「バネ」に乗った直後のジャンプでないと越えられません。</li>
                            <li>ゴールできたら1点。さらに「自分は成功したのに他の誰かが脱落した」場合は+1点のボーナスがもらえます。</li>
                            <li>全ラウンド終了時に合計点が一番高い人(複数の場合は全員)が優勝です。</li>
                        </ol>
                    </div>
                </details>
            </div>
        </div>
    `,

    init: function () {
        this.selectedTool = 'GAP';
        this.activeRunKey = null;
        this.runState = null;
        this.rafId = null;
        if (!this._keyBound) {
            this._keyBound = true;
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && gameState.gameType === 'traprun' && this.runState && !this.runState.finished) {
                    e.preventDefault();
                    this.jump();
                }
            });
        }
    },

    hostGame: function () {
        if (sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
        gameState.isStarted = true;
        gameState.gameType = 'traprun';
        gameState.roster = shufflePlayers(sortedPlayers.map(p => ({ accId: p.accId, name: p.name })));
        gameState.isEnded = false;
        gameState.winner = null;
        gameState.winnerHandText = '';

        const roster = gameState.roster;
        const width = Math.max(12, Math.min(18, 8 + roster.length * 2));
        const scores = {};
        roster.forEach(p => { scores[p.accId] = 0; });

        gameState.trap = {
            round: 0,
            totalRounds: Math.min(6, Math.max(3, roster.length)),
            width: width,
            track: new Array(width).fill('FLOOR'),
            placementsPerRound: 2,
            scores: scores
        };

        this.selectedTool = 'GAP';
        this.activeRunKey = null;
        this.runState = null;

        this.startRound(1);
        broadcastGameSync();
        syncGameUI();
    },

    startRound: function (roundNum) {
        const t = gameState.trap;
        const roster = gameState.roster;
        const rosterLen = roster.length;
        const startIdx = (roundNum - 1) % rosterLen;
        const rotated = roster.slice(startIdx).concat(roster.slice(0, startIdx));
        let order = [];
        for (let k = 0; k < t.placementsPerRound; k++) {
            rotated.forEach(p => order.push(p.accId));
        }
        t.round = roundNum;
        t.buildOrder = order;
        t.placementsMade = 0;
        t.phase = 'build';
        t.results = {};
        t.runOrder = null;
        t.runIndex = 0;
    },

    selectTool: function (tool) {
        this.selectedTool = tool;
        this.renderToolbar();
    },

    onTileClick: function (col) {
        this.placeTile(this.selectedTool, col);
    },

    placeTile: function (tool, col) {
        const t = gameState.trap;
        if (!t || t.phase !== 'build') return;
        if (t.buildOrder[t.placementsMade] !== myAccountId) { customAlert("あなたの番ではありません。"); return; }
        if (col <= 0 || col >= t.width - 1) { customAlert("スタートとゴールのマスは変更できません。"); return; }

        t.track[col] = tool;
        t.placementsMade += 1;

        if (t.placementsMade >= t.buildOrder.length) {
            t.phase = 'run';
            t.runOrder = gameState.roster.map(p => p.accId);
            t.runIndex = 0;
        }
        broadcastGameSync();
        syncGameUI();
    },

    // ---- 実行フェーズ(自分の番のときだけローカルで走らせるミニゲーム) ----

    beginMyRun: function () {
        const t = gameState.trap;
        this.activeRunKey = `${t.round}:${t.runIndex}`;
        this.runState = {
            col: 0,
            width: t.width,
            track: t.track.slice(),
            airborne: false,
            airEndTime: 0,
            canJumpAt: 0,
            lastFrame: null,
            dead: false,
            finished: false
        };
        this.renderMyRunnerPosition();
        this.rafId = requestAnimationFrame((now) => this.runFrame(now));
    },

    runFrame: function (now) {
        const rs = this.runState;
        if (!rs || rs.dead || rs.finished) return;
        const TILE_MS = 650;
        if (rs.lastFrame == null) rs.lastFrame = now;
        const dt = now - rs.lastFrame;
        rs.lastFrame = now;

        if (rs.airborne && now >= rs.airEndTime) {
            rs.airborne = false;
            rs.canJumpAt = now + 380; // 着地後、少しの間は再ジャンプできない(無敵の連続ジャンプ防止)
        }

        rs.col += dt / TILE_MS;

        if (rs.col >= rs.width - 1) {
            rs.col = rs.width - 1;
            this.renderMyRunnerPosition();
            this.finishMyRun(true, null);
            return;
        }

        if (!rs.airborne) {
            const tile = rs.track[Math.floor(rs.col)];
            if (tile === 'GAP' || tile === 'SPIKE') {
                this.finishMyRun(false, Math.floor(rs.col));
                return;
            }
        }

        this.renderMyRunnerPosition();
        this.rafId = requestAnimationFrame((n) => this.runFrame(n));
    },

    jump: function () {
        const rs = this.runState;
        if (!rs || rs.dead || rs.finished || rs.airborne) return;
        const now = performance.now();
        if (now < rs.canJumpAt) return;

        const curTile = rs.track[Math.floor(rs.col)];
        const boosted = curTile === 'SPRING';
        const durationMs = boosted ? 650 * 2.4 : 650 * 1.4;
        rs.airborne = true;
        rs.airEndTime = now + durationMs;

        const tokenEl = document.getElementById('traprun-my-token');
        if (tokenEl) {
            tokenEl.style.setProperty('--jump-duration', durationMs + 'ms');
            tokenEl.classList.remove('jumping');
            void tokenEl.offsetWidth; // reflow強制でアニメーションを再スタートさせる
            tokenEl.classList.add('jumping');
        }
    },

    finishMyRun: function (success, deathCol) {
        if (this.runState) this.runState.finished = true;
        if (this.rafId) cancelAnimationFrame(this.rafId);

        const t = gameState.trap;
        t.results[myAccountId] = { success: success, deathCol: (deathCol == null ? null : deathCol) };
        t.runIndex += 1;

        if (t.runIndex >= t.runOrder.length) {
            this.finalizeRoundScores();
        }
        broadcastGameSync();
        syncGameUI();
    },

    finalizeRoundScores: function () {
        const t = gameState.trap;
        const roster = gameState.roster;
        const successCount = roster.filter(p => t.results[p.accId] && t.results[p.accId].success).length;

        roster.forEach(p => {
            const r = t.results[p.accId];
            if (r && r.success) {
                t.scores[p.accId] = (t.scores[p.accId] || 0) + 1;
                if (successCount < roster.length) t.scores[p.accId] += 1; // 生き残りボーナス
            }
        });

        if (t.round >= t.totalRounds) {
            t.phase = 'finished';
            const maxScore = Math.max(...roster.map(p => t.scores[p.accId] || 0));
            const winners = roster.filter(p => (t.scores[p.accId] || 0) === maxScore);
            gameState.winner = winners.map(p => p.name).join('・');
            gameState.winnerHandText = `${maxScore}点`;
            gameState.isEnded = true;
        } else {
            t.phase = 'roundResult';
        }
    },

    nextRound: function () {
        const t = gameState.trap;
        if (!t || t.phase !== 'roundResult') return;
        if (!gameState.roster[0] || gameState.roster[0].accId !== myAccountId) return;
        this.startRound(t.round + 1);
        broadcastGameSync();
        syncGameUI();
    },

    // ---- 描画 ----

    renderTrack: function () {
        const t = gameState.trap;
        if (!t) return;
        const trackEl = document.getElementById('traprun-track');
        if (!trackEl) return;
        const isMyBuildTurn = (t.phase === 'build' && t.buildOrder[t.placementsMade] === myAccountId);
        const icons = { FLOOR: '', GAP: '🕳️', SPIKE: '📌', SPRING: '🌀' };
        let html = '';
        for (let i = 0; i < t.width; i++) {
            const type = t.track[i];
            const isStart = (i === 0);
            const isGoal = (i === t.width - 1);
            const editable = isMyBuildTurn && !isStart && !isGoal;
            const cls = ['traprun-tile'];
            if (isStart) cls.push('start');
            else if (isGoal) cls.push('goal');
            else cls.push(type);
            if (editable) cls.push('editable');
            const icon = isStart ? '🚩' : (isGoal ? '🏁' : icons[type]);
            html += `<div class="${cls.join(' ')}"${editable ? ` onclick="GameRegistry.traprun.onTileClick(${i})"` : ''}>${icon}</div>`;
        }
        trackEl.innerHTML = html;
    },

    renderRunners: function () {
        const t = gameState.trap;
        if (!t) return;
        const layer = document.getElementById('traprun-runner-layer');
        if (!layer) return;
        if (t.phase !== 'run' && t.phase !== 'roundResult') { layer.innerHTML = ''; return; }

        const roster = gameState.roster;
        let html = '';
        roster.forEach(p => {
            const isMyLiveRun = (p.accId === myAccountId && t.phase === 'run' &&
                t.runOrder && t.runOrder[t.runIndex] === myAccountId &&
                this.runState && !this.runState.finished);
            if (isMyLiveRun) return; // 自分の実行中トークンは renderMyRunnerPosition が描画する

            const result = t.results[p.accId];
            let colPos = 0;
            let dead = false;
            if (result) {
                colPos = result.success ? (t.width - 1) : (result.deathCol == null ? 0 : result.deathCol);
                dead = !result.success;
            }
            const leftPct = (colPos / (t.width - 1)) * 100;
            const initial = escapeHtml((p.name || '?').slice(0, 1));
            html += `<div class="traprun-runner-token ${p.accId === myAccountId ? 'me' : ''} ${dead ? 'dead' : ''}" style="left:${leftPct}%;" title="${escapeHtml(p.name)}">${initial}</div>`;
        });
        layer.innerHTML = html;
    },

    renderMyRunnerPosition: function () {
        const layer = document.getElementById('traprun-runner-layer');
        if (!layer || !this.runState) return;
        let el = document.getElementById('traprun-my-token');
        if (!el) {
            el = document.createElement('div');
            el.id = 'traprun-my-token';
            el.className = 'traprun-runner-token me';
            el.textContent = escapeHtml((myName || '?').slice(0, 1));
            layer.appendChild(el);
        }
        const leftPct = (this.runState.col / (this.runState.width - 1)) * 100;
        el.style.left = leftPct + '%';
    },

    renderToolbar: function () {
        const t = gameState.trap;
        const toolbar = document.getElementById('traprun-toolbar');
        if (!toolbar || !t) return;
        const isMyTurn = (t.phase === 'build' && t.buildOrder[t.placementsMade] === myAccountId);
        toolbar.style.display = (t.phase === 'build') ? 'flex' : 'none';
        toolbar.querySelectorAll('.traprun-tool-btn').forEach(btn => {
            btn.disabled = !isMyTurn;
            btn.classList.toggle('active', btn.dataset.tool === this.selectedTool);
        });
    },

    renderPhaseBanner: function () {
        const t = gameState.trap;
        const el = document.getElementById('traprun-phase-banner');
        if (!el || !t) return;
        const roster = gameState.roster;

        if (t.phase === 'build') {
            const builder = roster.find(p => p.accId === t.buildOrder[t.placementsMade]);
            const remaining = t.buildOrder.length - t.placementsMade;
            el.textContent = (t.buildOrder[t.placementsMade] === myAccountId)
                ? `🔨 あなたの番です！道具を選んでマスをクリックしてください(このラウンド残り${remaining}手)`
                : `🔨 ${builder ? builder.name : '?'}さんが仕掛けを設置しています…(残り${remaining}手)`;
        } else if (t.phase === 'run') {
            const runner = roster.find(p => p.accId === t.runOrder[t.runIndex]);
            el.textContent = (t.runOrder[t.runIndex] === myAccountId)
                ? `🏃 あなたの番です！「ジャンプ」ボタンでタイミングよく跳んでゴールを目指してください！`
                : `🏃 ${runner ? runner.name : '?'}さんが挑戦中…`;
        } else if (t.phase === 'roundResult') {
            const hostP = roster[0];
            el.textContent = (hostP && hostP.accId === myAccountId)
                ? `📋 ラウンド${t.round}の結果発表！準備ができたら次のラウンドへ進めましょう`
                : `📋 ラウンド${t.round}の結果発表！(${hostP ? hostP.name : '?'}さんが次のラウンドへ進めます)`;
        }
    },

    renderRoundResultPanel: function () {
        const t = gameState.trap;
        const listEl = document.getElementById('traprun-round-result-list');
        const nextBtnWrap = document.getElementById('traprun-next-round-action');
        const runActionWrap = document.getElementById('traprun-run-action');
        if (!listEl || !t) return;

        const isMyRunTurn = (t.phase === 'run' && t.runOrder && t.runOrder[t.runIndex] === myAccountId);
        if (runActionWrap) runActionWrap.style.display = isMyRunTurn ? 'flex' : 'none';

        if (t.phase !== 'roundResult') {
            listEl.innerHTML = '';
            if (nextBtnWrap) nextBtnWrap.style.display = 'none';
            return;
        }

        const roster = gameState.roster;
        listEl.innerHTML = roster.map(p => {
            const r = t.results[p.accId];
            const ok = !!(r && r.success);
            return `<div class="traprun-result-row ${ok ? 'success' : 'fail'}">
                <span>${escapeHtml(p.name)}</span>
                <span>${ok ? '✅ ゴール成功' : '💥 脱落'} ・ 累計 ${t.scores[p.accId] || 0}点</span>
            </div>`;
        }).join('');

        if (nextBtnWrap) {
            nextBtnWrap.style.display = (roster[0] && roster[0].accId === myAccountId) ? 'flex' : 'none';
        }
    },

    renderFinalRanking: function () {
        const t = gameState.trap;
        const wrap = document.getElementById('traprun-final-ranking');
        if (!wrap || !t) return;
        const ranked = [...gameState.roster].sort((a, b) => (t.scores[b.accId] || 0) - (t.scores[a.accId] || 0));
        wrap.innerHTML = ranked.map((p, i) => `
            <div class="traprun-result-row ${i === 0 ? 'success' : ''}">
                <span>${i + 1}位 ${escapeHtml(p.name)}</span>
                <span>${t.scores[p.accId] || 0}点</span>
            </div>
        `).join('');
    },

    syncUI: function () {
        document.getElementById('game-title-label').textContent = "トラップランナー";
        showGameBoard('traprun-board-area');

        const t = gameState.trap;
        if (!t) return;

        const roster = gameState.roster || [];
        const amInRoster = roster.some(p => p.accId === myAccountId);
        const spectatorBanner = document.getElementById('traprun-spectator-banner');
        if (spectatorBanner) spectatorBanner.style.display = amInRoster ? 'none' : 'block';

        const winnerOverlay = document.getElementById('traprun-winner-overlay');
        const playingArea = document.getElementById('traprun-playing-area');

        if (t.phase === 'finished' || gameState.isEnded) {
            if (winnerOverlay) winnerOverlay.style.display = 'flex';
            if (playingArea) playingArea.style.display = 'none';
            document.getElementById('traprun-winner-name').textContent = `${gameState.winner} 優勝！`;
            document.getElementById('traprun-winner-score').textContent = gameState.winnerHandText || '';
            this.renderFinalRanking();
            return;
        }
        if (winnerOverlay) winnerOverlay.style.display = 'none';
        if (playingArea) playingArea.style.display = 'block';

        document.getElementById('traprun-round-indicator').textContent = `ラウンド ${t.round} / ${t.totalRounds}`;

        this.renderTrack();
        this.renderRunners();
        this.renderToolbar();
        this.renderPhaseBanner();
        this.renderRoundResultPanel();

        if (t.phase === 'run' && t.runOrder) {
            const key = `${t.round}:${t.runIndex}`;
            if (t.runOrder[t.runIndex] === myAccountId && this.activeRunKey !== key) {
                this.beginMyRun();
            }
        }
    }
};