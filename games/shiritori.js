// GameRegistryにお絵描きしりとりの機能と表示パーツをすべて登録
GameRegistry.shiritori = {
    // 既存のHTMLテンプレート
    template: `
        <div class="draw-board" id="draw-board-area">
            <div class="previous-hint-area" id="draw-hint-area">
                <div id="hint-text" style="font-size: 0.8rem; font-weight: bold; color: var(--accent-color);">前の人の絵を読み込み中...</div>
                <img id="hint-image-view" class="hint-img" src="" style="display: none;" alt="ヒント画像">
            </div>

            <div class="zoom-controls">
                <button class="tool-btn active" id="mode-draw-btn" onclick="GameRegistry.shiritori.setInteractionMode('draw')">✏️ お絵描き</button>
                <button class="tool-btn" id="mode-move-btn" onclick="GameRegistry.shiritori.setInteractionMode('move')">✋ 移動</button>
                <span style="color:#444; margin:0 4px;">|</span>
                <button class="tool-btn" onclick="GameRegistry.shiritori.zoomCanvas(-0.25)">🔍－</button>
                <span id="zoom-level-label">100%</span>
                <button class="tool-btn" onclick="GameRegistry.shiritori.zoomCanvas(0.25)">🔍＋</button>
                <button class="tool-btn" onclick="GameRegistry.shiritori.resetCanvasZoom()">リセット</button>
            </div>
            <div class="canvas-container draw-mode" id="canvas-view-container">
                <canvas id="paint-canvas" width="500" height="500"></canvas>
            </div>
            
            <div class="draw-tools" id="canvas-toolbar">
                <div class="tool-select">
                    <button class="tool-btn active" id="tool-pencil" onclick="GameRegistry.shiritori.setTool('pencil')">✏️ 鉛筆</button>
                    <button class="tool-btn" id="tool-eraser" onclick="GameRegistry.shiritori.setTool('eraser')">🧽 消しゴム</button>
                    <button class="tool-btn" id="tool-bucket" onclick="GameRegistry.shiritori.setTool('bucket')">🪣 バケツ</button>
                    <button class="tool-btn btn-danger" onclick="GameRegistry.shiritori.clearCanvasSync()">🗑️ 全削除</button>
                </div>
                <div class="tool-select">
                    <button class="tool-btn undo-redo" id="btn-undo" onclick="GameRegistry.shiritori.undoDraw()" disabled>↩️ 一つ戻る</button>
                    <button class="tool-btn undo-redo" id="btn-redo" onclick="GameRegistry.shiritori.redoDraw()" disabled>↪️ 一つ進む</button>
                </div>
                <div class="palette" id="color-palette">
                    <div class="palette-color active" style="background:#000000;" onclick="GameRegistry.shiritori.setColor('#000000', this)"></div>
                    <div class="palette-color" style="background:#ff3333;" onclick="GameRegistry.shiritori.setColor('#ff3333', this)"></div>
                    <div class="palette-color" style="background:#3333ff;" onclick="GameRegistry.shiritori.setColor('#3333ff', this)"></div>
                    <div class="palette-color" style="background:#33cc33;" onclick="GameRegistry.shiritori.setColor('#33cc33', this)"></div>
                    <div class="palette-color" style="background:#f1c40f;" onclick="GameRegistry.shiritori.setColor('#f1c40f', this)"></div>
                    <div class="custom-picker-wrapper" id="custom-color-wrapper">
                        <input type="color" id="palette-custom-picker" onchange="GameRegistry.shiritori.setCustomColor(this.value)">
                    </div>
                </div>
            </div>

            <label style="margin-top:2px;">この絵の名前(ひらがな限定)
                <input type="text" id="inp-draw-word" placeholder="例: りんご" maxlength="20">
            </label>
            <div class="action-container">
                <button class="btn btn-success" id="btn-draw-ok" onclick="GameRegistry.shiritori.submitDrawTurn()">OK (次の人へ)</button>
                <button class="btn btn-danger" id="btn-draw-end" onclick="GameRegistry.shiritori.endDrawGame()">終了 (答え合わせ)</button>
            </div>
        </div>

        <div class="result-view" id="draw-result-area"></div>
    `,

    canvas: null, ctx: null, isDrawing: false, currentTool: 'pencil', currentColor: '#000000',
    lastX: 0, lastY: 0, canvasZoom: 1, isDraggingCanvas: false, dragStartX: 0, dragStartY: 0,
    scrollLeftStart: 0, scrollTopStart: 0, containerEl: null, pendingDrawActions: [], drawFlushHandle: null,
    drawUndoStack: [], drawRedoStack: [], lastKnownTurnIndex: -1, interactionMode: 'draw',

<<<<<<< HEAD
    init: function () {
        this.canvas = document.getElementById('paint-canvas');
        this.containerEl = document.getElementById('canvas-view-container');
        if (!this.canvas) return;
=======
    init: function() {
        this.canvas = document.getElementById('paint-canvas');
        this.containerEl = document.getElementById('canvas-view-container');
        if(!this.canvas) return;
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.ctx = this.canvas.getContext('2d');
        this.clearCanvasLocal();
        this.updateUndoRedoButtons();
        this.setupCanvasListeners();
    },

<<<<<<< HEAD
    setupCanvasListeners: function () {
=======
    setupCanvasListeners: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const self = this;
        this.containerEl.addEventListener('mousedown', (e) => {
            if (self.interactionMode === 'move' || e.button === 2) {
                self.isDraggingCanvas = true;
                self.dragStartX = e.clientX; self.dragStartY = e.clientY;
                self.scrollLeftStart = self.containerEl.scrollLeft; self.scrollTopStart = self.containerEl.scrollTop;
                e.preventDefault(); return;
            }
            const activePlayer = getActivePlayer();
            if (!gameState.isStarted || gameState.isEnded || !activePlayer || activePlayer.accId !== myAccountId) return;
<<<<<<< HEAD

=======
            
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
            const pos = self.getCanvasEventPos(e);
            if (self.currentTool === 'bucket') {
                self.saveUndoSnapshot();
                self.floodFill(Math.floor(pos.x), Math.floor(pos.y), self.currentColor);
                self.broadcastDrawAction({ action: 'fill', x: Math.floor(pos.x), y: Math.floor(pos.y), color: self.currentColor });
                return;
            }
            self.saveUndoSnapshot();
            self.isDrawing = true; self.lastX = pos.x; self.lastY = pos.y;
            self.drawDot(pos.x, pos.y);
            self.broadcastDrawAction({ action: 'dot', x: pos.x, y: pos.y, tool: self.currentTool, color: self.currentColor });
        });

        this.containerEl.addEventListener('mousemove', (e) => {
            if (self.isDraggingCanvas) {
                self.containerEl.scrollLeft = self.scrollLeftStart - (e.clientX - self.dragStartX);
                self.containerEl.scrollTop = self.scrollTopStart - (e.clientY - self.dragStartY);
                return;
            }
            if (!self.isDrawing || self.interactionMode !== 'draw') return;
            const pos = self.getCanvasEventPos(e);
            self.drawSegments(pos.x, pos.y);
            self.broadcastDrawAction({ action: 'line', x1: self.lastX, y1: self.lastY, x2: pos.x, y2: pos.y, tool: self.currentTool, color: self.currentColor });
            self.lastX = pos.x; self.lastY = pos.y;
        });

        this.containerEl.addEventListener('contextmenu', (e) => { e.preventDefault(); });
        window.addEventListener('mouseup', () => { self.isDrawing = false; self.isDraggingCanvas = false; });

        this.containerEl.addEventListener('touchstart', (e) => {
            if (self.interactionMode === 'move' || e.touches.length >= 2) {
                self.isDraggingCanvas = true;
                const t = e.touches[0];
                self.dragStartX = t.clientX; self.dragStartY = t.clientY;
                self.scrollLeftStart = self.containerEl.scrollLeft; self.scrollTopStart = self.containerEl.scrollTop;
                self.isDrawing = false; return;
            }
            if (e.touches.length === 1) {
                const activePlayer = getActivePlayer();
                if (!gameState.isStarted || gameState.isEnded || !activePlayer || activePlayer.accId !== myAccountId) return;
                e.preventDefault();
                const pos = self.getCanvasEventPos(e.touches[0]);
                if (self.currentTool === 'bucket') {
                    self.saveUndoSnapshot();
                    self.floodFill(Math.floor(pos.x), Math.floor(pos.y), self.currentColor);
                    self.broadcastDrawAction({ action: 'fill', x: Math.floor(pos.x), y: Math.floor(pos.y), color: self.currentColor });
                    return;
                }
                self.saveUndoSnapshot();
                self.isDrawing = true; self.lastX = pos.x; self.lastY = pos.y;
                self.drawDot(pos.x, pos.y);
                self.broadcastDrawAction({ action: 'dot', x: pos.x, y: pos.y, tool: self.currentTool, color: self.currentColor });
            }
        }, { passive: false });
<<<<<<< HEAD

=======
        
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.containerEl.addEventListener('touchmove', (e) => {
            if (self.isDraggingCanvas) {
                const t = e.touches[0];
                self.containerEl.scrollLeft = self.scrollLeftStart - (t.clientX - self.dragStartX);
                self.containerEl.scrollTop = self.scrollTopStart - (t.clientY - self.dragStartY);
                return;
            }
            if (!self.isDrawing || e.touches.length !== 1 || self.interactionMode !== 'draw') return;
            e.preventDefault();
            const pos = self.getCanvasEventPos(e.touches[0]);
            self.drawSegments(pos.x, pos.y);
            self.broadcastDrawAction({ action: 'line', x1: self.lastX, y1: self.lastY, x2: pos.x, y2: pos.y, tool: self.currentTool, color: self.currentColor });
            self.lastX = pos.x; self.lastY = pos.y;
        }, { passive: false });

        this.containerEl.addEventListener('touchend', () => { self.isDrawing = false; self.isDraggingCanvas = false; });
    },

<<<<<<< HEAD
    handleData: function (data) {
=======
    handleData: function(data) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (data.type === 'REALTIME_DRAW_BATCH') {
            (data.actions || []).forEach(a => this.handleRemoteDrawAction(a));
        }
        else if (data.type === 'CANVAS_FULL_SYNC') {
            this.restoreCanvasFromDataUrl(data.dataUrl);
        }
    },

<<<<<<< HEAD
    hostGame: function () {
        if (sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
=======
    hostGame: function() {
        if(sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        gameState.isStarted = true;
        gameState.gameType = 'shiritori';
        gameState.roster = shufflePlayers(sortedPlayers.map(p => ({ accId: p.accId, name: p.name })));
        gameState.turnIndex = Math.floor(Math.random() * gameState.roster.length);
        this.lastKnownTurnIndex = gameState.turnIndex;
        gameState.history = [];
        gameState.isEnded = false;

        this.clearCanvasLocal();
        this.resetDrawHistory();
        this.resetCanvasZoom();
        const wordInput = document.getElementById('inp-draw-word');
        if (wordInput) wordInput.value = "";
<<<<<<< HEAD
        broadcastGameSync();
        syncGameUI();
    },

    setInteractionMode: function (mode) {
=======
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    setInteractionMode: function(mode) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.interactionMode = mode;
        document.getElementById('mode-draw-btn').classList.toggle('active', mode === 'draw');
        document.getElementById('mode-move-btn').classList.toggle('active', mode === 'move');
        if (this.containerEl) {
            this.containerEl.className = (mode === 'move') ? "canvas-container move-mode" : "canvas-container draw-mode";
        }
        this.isDrawing = false;
        this.isDraggingCanvas = false;
    },

<<<<<<< HEAD
    zoomCanvas: function (delta) {
=======
    zoomCanvas: function(delta) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.canvasZoom = Math.max(1, Math.min(3, Math.round((this.canvasZoom + delta) * 100) / 100));
        this.applyCanvasZoom();
    },

<<<<<<< HEAD
    resetCanvasZoom: function () {
=======
    resetCanvasZoom: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.canvasZoom = 1;
        this.applyCanvasZoom();
    },

<<<<<<< HEAD
    applyCanvasZoom: function () {
=======
    applyCanvasZoom: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (!this.canvas) return;
        this.canvas.style.width = (this.canvasZoom * 100) + '%';
        this.canvas.style.height = (this.canvasZoom * 100) + '%';
        if (this.canvasZoom === 1) {
            this.containerEl.scrollLeft = 0;
            this.containerEl.scrollTop = 0;
        }
        const label = document.getElementById('zoom-level-label');
        if (label) label.textContent = Math.round(this.canvasZoom * 100) + '%';
    },

<<<<<<< HEAD
    getCanvasEventPos: function (clientXorEvent) {
=======
    getCanvasEventPos: function(clientXorEvent) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const rect = this.canvas.getBoundingClientRect();
        const cX = clientXorEvent.clientX !== undefined ? clientXorEvent.clientX : clientXorEvent.pageX;
        const cY = clientXorEvent.clientY !== undefined ? clientXorEvent.clientY : clientXorEvent.pageY;
        return {
            x: (cX - rect.left) * (this.canvas.width / rect.width),
            y: (cY - rect.top) * (this.canvas.height / rect.height)
        };
    },

<<<<<<< HEAD
    drawDot: function (x, y) {
=======
    drawDot: function(x, y) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.ctx.beginPath();
        this.ctx.arc(x, y, (this.currentTool === 'eraser' ? 12 : 2.5), 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
        this.ctx.fill();
    },

<<<<<<< HEAD
    drawSegments: function (x, y) {
=======
    drawSegments: function(x, y) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.ctx.beginPath(); this.ctx.moveTo(this.lastX, this.lastY); this.ctx.lineTo(x, y);
        if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = 24;
        } else {
            this.ctx.strokeStyle = this.currentColor; this.ctx.lineWidth = 5;
        }
        this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; this.ctx.stroke();
    },

<<<<<<< HEAD
    broadcastDrawAction: function (data) {
=======
    broadcastDrawAction: function(data) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.pendingDrawActions.push(data);
        if (this.drawFlushHandle === null) {
            this.drawFlushHandle = requestAnimationFrame(() => this.flushDrawActions());
        }
    },

<<<<<<< HEAD
    flushDrawActions: function () {
=======
    flushDrawActions: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.drawFlushHandle = null;
        if (this.pendingDrawActions.length === 0) return;
        broadcast({ type: 'REALTIME_DRAW_BATCH', actions: this.pendingDrawActions });
        this.pendingDrawActions = [];
    },

<<<<<<< HEAD
    handleRemoteDrawAction: function (remoteData) {
=======
    handleRemoteDrawAction: function(remoteData) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const activePlayer = getActivePlayer();
        if (!activePlayer || activePlayer.accId === myAccountId) return;
        if (remoteData.action === 'dot') {
            this.ctx.beginPath(); this.ctx.arc(remoteData.x, remoteData.y, (remoteData.tool === 'eraser' ? 12 : 2.5), 0, Math.PI * 2);
            this.ctx.fillStyle = remoteData.tool === 'eraser' ? '#ffffff' : remoteData.color; this.ctx.fill();
        } else if (remoteData.action === 'line') {
            this.ctx.beginPath(); this.ctx.moveTo(remoteData.x1, remoteData.y1); this.ctx.lineTo(remoteData.x2, remoteData.y2);
            if (remoteData.tool === 'eraser') { this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = 24; }
            else { this.ctx.strokeStyle = remoteData.color; this.ctx.lineWidth = 5; }
            this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        } else if (remoteData.action === 'fill') {
            this.floodFill(remoteData.x, remoteData.y, remoteData.color);
        } else if (remoteData.action === 'clear') {
            this.clearCanvasLocal();
        }
    },

<<<<<<< HEAD
    setTool: function (tool) {
        this.currentTool = tool;
        document.querySelectorAll('#canvas-toolbar .tool-btn').forEach(btn => btn.classList.remove('active'));
        const target = document.getElementById(`tool-${tool}`);
        if (target) target.classList.add('active');
        this.setInteractionMode('draw');
    },

    setColor: function (color, element) {
        this.currentColor = color;
        document.querySelectorAll('.palette-color, .custom-picker-wrapper').forEach(p => p.classList.remove('active'));
        if (element) element.classList.add('active');
=======
    setTool: function(tool) {
        this.currentTool = tool;
        document.querySelectorAll('#canvas-toolbar .tool-btn').forEach(btn => btn.classList.remove('active'));
        const target = document.getElementById(`tool-${tool}`);
        if(target) target.classList.add('active');
        this.setInteractionMode('draw');
    },

    setColor: function(color, element) {
        this.currentColor = color;
        document.querySelectorAll('.palette-color, .custom-picker-wrapper').forEach(p => p.classList.remove('active'));
        if(element) element.classList.add('active');
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (this.currentTool === 'eraser') this.setTool('pencil');
        this.setInteractionMode('draw');
    },

<<<<<<< HEAD
    setCustomColor: function (color) {
=======
    setCustomColor: function(color) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.currentColor = color;
        const wrapper = document.getElementById('custom-color-wrapper');
        this.setColor(color, wrapper);
    },

<<<<<<< HEAD
    clearCanvasLocal: function () {
=======
    clearCanvasLocal: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (!this.canvas) return;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

<<<<<<< HEAD
    resetDrawHistory: function () {
=======
    resetDrawHistory: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.drawUndoStack = []; this.drawRedoStack = [];
        this.updateUndoRedoButtons();
    },

<<<<<<< HEAD
    clearCanvasSync: function () {
=======
    clearCanvasSync: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        this.saveUndoSnapshot();
        this.clearCanvasLocal();
        this.broadcastDrawAction({ action: 'clear' });
    },

<<<<<<< HEAD
    saveUndoSnapshot: function () {
=======
    saveUndoSnapshot: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (!this.canvas) return;
        this.drawUndoStack.push(this.canvas.toDataURL());
        if (this.drawUndoStack.length > 30) this.drawUndoStack.shift();
        this.drawRedoStack = [];
        this.updateUndoRedoButtons();
    },

<<<<<<< HEAD
    restoreCanvasFromDataUrl: function (dataUrl) {
=======
    restoreCanvasFromDataUrl: function(dataUrl) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = dataUrl;
    },

<<<<<<< HEAD
    undoDraw: function () {
=======
    undoDraw: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (this.drawUndoStack.length === 0) return;
        this.drawRedoStack.push(this.canvas.toDataURL());
        const prevState = this.drawUndoStack.pop();
        this.restoreCanvasFromDataUrl(prevState);
        this.updateUndoRedoButtons();
        setTimeout(() => { broadcast({ type: 'CANVAS_FULL_SYNC', dataUrl: this.canvas.toDataURL() }); }, 50);
    },

<<<<<<< HEAD
    redoDraw: function () {
=======
    redoDraw: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (this.drawRedoStack.length === 0) return;
        this.drawUndoStack.push(this.canvas.toDataURL());
        const nextState = this.drawRedoStack.pop();
        this.restoreCanvasFromDataUrl(nextState);
        this.updateUndoRedoButtons();
        setTimeout(() => { broadcast({ type: 'CANVAS_FULL_SYNC', dataUrl: this.canvas.toDataURL() }); }, 50);
    },

<<<<<<< HEAD
    updateUndoRedoButtons: function () {
=======
    updateUndoRedoButtons: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = this.drawUndoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.drawRedoStack.length === 0;
    },

<<<<<<< HEAD
    floodFill: function (startX, startY, fillColor) {
=======
    floodFill: function(startX, startY, fillColor) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const targetColor = this.ctx.getImageData(startX, startY, 1, 1).data;
        const fillRGB = this.hexToRgb(fillColor);
        if (this.matchColor(targetColor, fillRGB)) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width; const height = this.canvas.height;
        const queue = [[startX, startY]];
<<<<<<< HEAD

        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const idx = (cy * width + cx) * 4;
            if (this.matchColor([data[idx], data[idx + 1], data[idx + 2]], targetColor)) {
                data[idx] = fillRGB[0]; data[idx + 1] = fillRGB[1]; data[idx + 2] = fillRGB[2];
=======
        
        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const idx = (cy * width + cx) * 4;
            if (this.matchColor([data[idx], data[idx+1], data[idx+2]], targetColor)) {
                data[idx] = fillRGB[0]; data[idx+1] = fillRGB[1]; data[idx+2] = fillRGB[2];
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
                if (cx > 0) queue.push([cx - 1, cy]);
                if (cx < width - 1) queue.push([cx + 1, cy]);
                if (cy > 0) queue.push([cx, cy - 1]);
                if (cy < height - 1) queue.push([cx, cy + 1]);
            }
        }
        this.ctx.putImageData(imageData, 0, 0);
    },

<<<<<<< HEAD
    matchColor: function (c1, c2) { return Math.abs(c1[0] - c2[0]) < 10 && Math.abs(c1[1] - c2[1]) < 10 && Math.abs(c1[2] - c2[2]) < 10; },
    hexToRgb: function (hex) { const bigint = parseInt(hex.slice(1), 16); return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]; },

    isOnlyHiragana: function (str) {
=======
    matchColor: function(c1, c2) { return Math.abs(c1[0] - c2[0]) < 10 && Math.abs(c1[1] - c2[1]) < 10 && Math.abs(c1[2] - c2[2]) < 10; },
    hexToRgb: function(hex) { const bigint = parseInt(hex.slice(1), 16); return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]; },

    isOnlyHiragana: function(str) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const cleanStr = str.replace(/\s+/g, '');
        return /^[\u3041-\u3096ー]+$/.test(cleanStr);
    },

<<<<<<< HEAD
    submitDrawTurn: function () {
=======
    submitDrawTurn: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const activePlayer = getActivePlayer();
        if (!activePlayer || activePlayer.accId !== myAccountId) return;

        const wordInput = document.getElementById('inp-draw-word');
        const word = wordInput.value.trim();
        if (!word) { customAlert("この絵の名前を入力してください！"); return; }
        if (!this.isOnlyHiragana(word)) {
            customAlert("名前欄にひらがな（または『ー』）以外の文字が含まれています。すべてひらがなで入力してください！");
            return;
        }

        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.6);
        gameState.history.push({ painter: myName, img: dataUrl, word: word });
<<<<<<< HEAD

=======
        
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        if (this.endsWithN(word)) {
            customAlert("「ん」がついたため、ここで自動的にしりとり終了となります！");
            gameState.isEnded = true;
        } else {
            gameState.turnIndex = (gameState.turnIndex + 1) % getRoster().length;
        }
<<<<<<< HEAD

        this.clearCanvasLocal(); this.resetDrawHistory(); this.resetCanvasZoom(); this.setInteractionMode('draw');
        wordInput.value = "";
        broadcastGameSync();
        syncGameUI();
    },

    endDrawGame: function () {
=======
        
        this.clearCanvasLocal(); this.resetDrawHistory(); this.resetCanvasZoom(); this.setInteractionMode('draw');
        wordInput.value = "";
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    endDrawGame: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const activePlayer = getActivePlayer();
        if (activePlayer && activePlayer.accId === myAccountId) {
            const wordInput = document.getElementById('inp-draw-word');
            const word = wordInput.value.trim();
            if (!word) { customAlert("この絵の名前を入力してから終了してください！"); return; }
            if (!this.isOnlyHiragana(word)) {
                customAlert("名前欄にひらがな（または『ー』）以外の文字が含まれています。すべてひらがなで入力してください！");
                return;
            }
            const dataUrl = this.canvas.toDataURL('image/jpeg', 0.6);
            gameState.history.push({ painter: myName, img: dataUrl, word: word });
            wordInput.value = "";
        }
        gameState.isEnded = true; this.resetCanvasZoom();
<<<<<<< HEAD
        broadcastGameSync();
        syncGameUI();
    },

    renderResults: function () {
=======
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    renderResults: function() {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const resultArea = document.getElementById('draw-result-area');
        resultArea.innerHTML = "";
        const { results, allOk } = this.judgeShiritori(gameState.history);

        const banner = document.createElement('div');
        banner.style.cssText = 'text-align:center; font-weight:bold; font-size:1rem; padding:10px; border-radius:8px;';
        if (allOk) {
            banner.style.background = 'rgba(46,204,113,0.2)'; banner.style.color = 'var(--success-color)';
            banner.textContent = '🎉 しりとり成立！見事につながっています！';
        } else {
            banner.style.background = 'rgba(231,76,60,0.2)'; banner.style.color = 'var(--danger-color)';
            banner.textContent = '❌ しりとりが終了しました';
        }
        resultArea.appendChild(banner);

        results.forEach((item, idx) => {
            const div = document.createElement('div');
            const isOk = item.issues.length === 0;
            div.className = 'result-item';
            div.style.border = `2px solid ${isOk ? 'var(--success-color)' : 'var(--danger-color)'}`;
            div.innerHTML = `
<<<<<<< HEAD
                <div style="font-weight:bold; color:var(--accent-color); font-size:0.9rem;">第 ${idx + 1} 走者: ${escapeHtml(item.painter)}</div>
                <img src="${escapeHtml(item.img)}" class="result-img" alt="絵"/>
                <div style="font-size:1rem; font-weight:bold; margin-top:4px;">「${escapeHtml(item.word) || '(名前未入力)'}」</div>
                <div style="font-size:0.75rem; margin-top:4px; color:${isOk ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${isOk ? '✅ OK' : '⚠️ ' + escapeHtml(item.issues.join(' / '))}
=======
                <div style="font-weight:bold; color:var(--accent-color); font-size:0.9rem;">第 ${idx + 1} 走者: ${item.painter}</div>
                <img src="${item.img}" class="result-img" alt="絵"/>
                <div style="font-size:1rem; font-weight:bold; margin-top:4px;">「${item.word || '(名前未入力)'}」</div>
                <div style="font-size:0.75rem; margin-top:4px; color:${isOk ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${isOk ? '✅ OK' : '⚠️ ' + item.issues.join(' / ')}
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
                </div>
            `;
            resultArea.appendChild(div);
        });

        const actionWrap = document.createElement('div');
        actionWrap.style.cssText = 'display:flex; flex-direction:column; gap:8px; margin-top:15px;';
<<<<<<< HEAD

        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn btn-success'; restartBtn.textContent = '🔄 もう一度プレイする (新しいゲーム)';
        restartBtn.onclick = () => { GameRegistry.shiritori.hostGame(); };

        const lobbyBtn = document.createElement('button');
        lobbyBtn.className = 'btn'; lobbyBtn.textContent = 'ロビーへ戻る';
        lobbyBtn.onclick = () => { sendReturnToLobby(); };

=======
        
        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn btn-success'; restartBtn.textContent = '🔄 もう一度プレイする (新しいゲーム)';
        restartBtn.onclick = () => { GameRegistry.shiritori.hostGame(); };
        
        const lobbyBtn = document.createElement('button');
        lobbyBtn.className = 'btn'; lobbyBtn.textContent = 'ロビーへ戻る';
        lobbyBtn.onclick = () => { sendReturnToLobby(); };
        
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        actionWrap.appendChild(restartBtn); actionWrap.appendChild(lobbyBtn);
        resultArea.appendChild(actionWrap);
    },

<<<<<<< HEAD
    judgeShiritori: function (history) {
=======
    judgeShiritori: function(history) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const results = history.map(item => ({ ...item, issues: [] }));
        const seen = new Set();
        results.forEach((item, i) => {
            const word = item.word || '';
            if (!word) { item.issues.push('名前が入力されていません'); return; }

            const key = this.normalizeWordChars(word).join('');
            if (seen.has(key) && i > 0) item.issues.push('すでに出てきた言葉と同じです');
            seen.add(key);

            if (i > 0) {
                const prevWord = results[i - 1].word || '';
                const prevLast = this.getLastSound(prevWord);
                const curFirst = this.getFirstSound(word);
                if (prevWord && prevLast && curFirst && prevLast !== curFirst) {
                    item.issues.push(`前の絵「${prevWord}」の最後の音「${prevLast}」と繋がっていません`);
                }
            }
            if (this.endsWithN(word)) { item.issues.push('「ん」で終わりました(ゲーム終了)'); }
        });
        const allOk = results.length > 0 && results.every(r => r.issues.length === 0);
        return { results, allOk };
    },

<<<<<<< HEAD
    katakanaToHiragana: function (ch) {
=======
    katakanaToHiragana: function(ch) {
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
        const code = ch.charCodeAt(0);
        if (code >= 0x30A1 && code <= 0x30F6) return String.fromCharCode(code - 0x60);
        return ch;
    },
<<<<<<< HEAD
    normalizeKanaChar: function (ch) {
        const smallMap = { 'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ' };
        return smallMap[ch] || ch;
    },
    normalizeWordChars: function (word) { return [...(word || '').trim()].map(this.katakanaToHiragana).map(this.normalizeKanaChar); },
    getFirstSound: function (word) { return this.normalizeWordChars(word)[0] || ''; },
    getLastSound: function (word) {
        const chars = this.normalizeWordChars(word);
        let idx = chars.length - 1;
        if (idx < 0) return '';
        if (chars[idx] === 'ー' && idx > 0) idx -= 1;
        return chars[idx];
    },
    endsWithN: function (word) { const chars = this.normalizeWordChars(word); return chars[chars.length - 1] === 'ん'; },

    syncUI: function () {
        document.getElementById('game-title-label').textContent = "お絵描きしりとりルーム";
        showGameBoard(gameState.isEnded ? 'draw-result-area' : 'draw-board-area');

        if (gameState.isEnded) {
            document.getElementById('game-info').textContent = "🎉 答え合わせ！みんなでしりとりが繋がっているか確認しましょう！";
            this.renderResults();
        } else {
=======
    normalizeKanaChar: function(ch) {
        const smallMap = { 'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ' };
        return smallMap[ch] || ch;
    },
    normalizeWordChars: function(word) { return [...(word || '').trim()].map(this.katakanaToHiragana).map(this.normalizeKanaChar); },
    getFirstSound: function(word) { return this.normalizeWordChars(word)[0] || ''; },
    getLastSound: function(word) {
        const chars = this.normalizeWordChars(word);
        let idx = chars.length - 1;
        if (idx < 0) return '';
        if (chars[idx] === 'ー' && idx > 0) idx -= 1; 
        return chars[idx];
    },
    endsWithN: function(word) { const chars = this.normalizeWordChars(word); return chars[chars.length - 1] === 'ん'; },

    syncUI: function() {
        document.getElementById('game-title-label').textContent = "お絵描きしりとりルーム";
        const unoBoard = document.getElementById('uno-board-area');
        if(unoBoard) unoBoard.classList.remove('active');
        const chinchiroBoard = document.getElementById('chinchiro-board-area');
        if(chinchiroBoard) chinchiroBoard.classList.remove('active');
        const chinchigutiBoard = document.getElementById('chinchiguti-board-area');
        if(chinchigutiBoard) chinchigutiBoard.classList.remove('active');
        
        if (gameState.isEnded) {
            document.getElementById('draw-board-area').classList.remove('active');
            document.getElementById('draw-result-area').classList.add('active');
            document.getElementById('game-info').textContent = "🎉 答え合わせ！みんなでしりとりが繋がっているか確認しましょう！";
            this.renderResults();
        } else {
            document.getElementById('draw-board-area').classList.add('active');
            document.getElementById('draw-result-area').classList.remove('active');
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6

            if (this.lastKnownTurnIndex !== gameState.turnIndex) {
                this.clearCanvasLocal(); this.resetDrawHistory(); this.resetCanvasZoom();
                this.lastKnownTurnIndex = gameState.turnIndex;
            }

            const hintText = document.getElementById('hint-text');
            const hintImageView = document.getElementById('hint-image-view');
            if (gameState.history.length > 0) {
                const lastDraw = gameState.history[gameState.history.length - 1];
<<<<<<< HEAD
                hintText.innerHTML = `前の走者 (<span style="color:#ffaa00;">${escapeHtml(lastDraw.painter)}</span>) が描いた絵：`;
=======
                hintText.innerHTML = `前の走者 (<span style="color:#ffaa00;">${lastDraw.painter}</span>) が描いた絵：`;
>>>>>>> 068bf5dd2faec4f321f01ef5ba027cf1860124e6
                hintImageView.src = lastDraw.img; hintImageView.style.display = "block";
            } else {
                hintText.textContent = (getActivePlayer()?.accId === myAccountId)
                    ? "あなたが最初の走者です！好きな絵を描いてスタートしてください 🎨"
                    : "最初の絵が描かれるのを待っています...";
                hintImageView.style.display = "none";
            }

            const infoBar = document.getElementById('game-info');
            const wordInput = document.getElementById('inp-draw-word');
            const isMyTurn = (getActivePlayer()?.accId === myAccountId);
            if (isMyTurn) {
                if (gameState.history && gameState.history.length === 0) {
                    infoBar.textContent = "お絵描きの方は、あなたが最初の走者です！好きなのを描いてください！";
                } else {
                    infoBar.textContent = "✏️ あなたの番です！リアルタイムにみんなへ絵が共有されています。";
                }
                document.getElementById('canvas-toolbar').style.pointerEvents = 'auto';
                document.getElementById('btn-draw-ok').disabled = false; wordInput.disabled = false;
            } else {
                infoBar.textContent = `⏱️ ${getActivePlayer() ? getActivePlayer().name : '相手'}がリアルタイムにお絵描き中です...👀`;
                document.getElementById('canvas-toolbar').style.pointerEvents = 'none';
                document.getElementById('btn-draw-ok').disabled = true; wordInput.disabled = true;
            }
        }
    }
};