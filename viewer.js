const POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];

function authHeader() {
    const token = localStorage.getItem('token');
    return { Authorization: 'Bearer ' + token };
}

let allParticipants = [];
let available = [];
let rows = [];
let participantsLoaded = false;
let hasVotedInThisFinal = false;
let votersListBlock = null;

// Mobile touch drag vars
let touchDrag = {
    element: null,
    type: null,
    data: null,
    ghost: null,
    targetElement: null,
    startX: 0,
    startY: 0,
    isDragging: false,
    longPressTimer: null
};

let autoScrollInterval = null;
let currentScrollContainer = null;
const AUTO_SCROLL_SPEED = 10;
const AUTO_SCROLL_ZONE = 70;
const LONG_PRESS_DELAY = 400; // 400ms долгое нажатие
const DRAG_THRESHOLD = 15; // 15px порог движения

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    currentScrollContainer = null;
}

function startAutoScroll(container, direction) {
    stopAutoScroll();
    currentScrollContainer = container;
    autoScrollInterval = setInterval(() => {
        if (currentScrollContainer) {
            currentScrollContainer.scrollTop += direction * AUTO_SCROLL_SPEED;
        }
    }, 16);
}

function checkAutoScroll(container, clientY) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;
    
    if (y < AUTO_SCROLL_ZONE && container.scrollTop > 0) {
        if (currentScrollContainer !== container) stopAutoScroll();
        startAutoScroll(container, -1);
    } else if (y > height - AUTO_SCROLL_ZONE && container.scrollTop < container.scrollHeight - height) {
        if (currentScrollContainer !== container) stopAutoScroll();
        startAutoScroll(container, 1);
    } else {
        if (currentScrollContainer === container) stopAutoScroll();
    }
}

function createGhost(data, x, y) {
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = (x - 30) + 'px';
    ghost.style.top = (y - 30) + 'px';
    ghost.style.width = '220px';
    ghost.style.backgroundColor = '#210E90';
    ghost.style.color = 'white';
    ghost.style.borderRadius = '12px';
    ghost.style.padding = '12px';
    ghost.style.zIndex = '10000';
    ghost.style.opacity = '0.85';
    ghost.style.pointerEvents = 'none';
    ghost.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    
    if (data.type === 'participant' && data.participant) {
        const p = data.participant;
        ghost.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:32px;font-weight:bold;">${p.order}</span><span><strong>${p.performer}</strong><br>${p.song}</span></div>`;
    } else if (data.type === 'score') {
        ghost.innerHTML = `<div style="font-size:32px;font-weight:bold;text-align:center;">${data.points}</div>`;
    }
    return ghost;
}

function cancelLongPress() {
    if (touchDrag.longPressTimer) {
        clearTimeout(touchDrag.longPressTimer);
        touchDrag.longPressTimer = null;
    }
}

function resetTouchDrag() {
    cancelLongPress();
    if (touchDrag.ghost) {
        touchDrag.ghost.remove();
        touchDrag.ghost = null;
    }
    if (touchDrag.element) {
        touchDrag.element.classList.remove('dragging-opacity');
    }
    if (touchDrag.targetElement) {
        touchDrag.targetElement.classList.remove('drag-over');
    }
    stopAutoScroll();
    touchDrag = {
        element: null,
        type: null,
        data: null,
        ghost: null,
        targetElement: null,
        startX: 0,
        startY: 0,
        isDragging: false,
        longPressTimer: null
    };
}

// Загружаем список проголосовавших
async function loadVotersList() {
    try {
        var resp = await fetch(`${API}?action=voters_list`);
        if (resp.ok) {
            var voters = await resp.json();
            renderVotersList(voters);
        }
    } catch(e) {
        console.error('Failed to load voters list:', e);
    }
}

function renderVotersList(voters) {
    var statusDiv = document.getElementById('viewerStatus');
    if (!statusDiv) return;
    
    // Удаляем старый блок если есть
    if (votersListBlock && votersListBlock.parentNode) {
        votersListBlock.remove();
    }
    
    votersListBlock = document.createElement('div');
    votersListBlock.id = 'votersList';
    votersListBlock.style.width = '100%';
    
    if (voters.length === 0) {
        votersListBlock.style.display = 'none';
        statusDiv.appendChild(votersListBlock);
        return;
    }
    
    // Создаём заголовок с кнопкой
    var header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.background = 'rgba(0,0,0,0.05)';
    header.style.padding = '8px 12px';
    header.style.borderRadius = '8px';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    
    var titleSpan = document.createElement('span');
    titleSpan.innerHTML = `<strong>✅ Проголосовало ${voters.length}:</strong>`;
    
    var toggleBtn = document.createElement('span');
    toggleBtn.textContent = '▼';
    toggleBtn.style.fontSize = '16px';
    toggleBtn.style.transition = 'transform 0.2s';
    
    header.appendChild(titleSpan);
    header.appendChild(toggleBtn);
    
    // Создаём список (свёрнут по умолчанию)
    var listDiv = document.createElement('div');
    listDiv.style.marginTop = '8px';
    listDiv.style.paddingLeft = '12px';
    listDiv.style.fontSize = '14px';
    listDiv.style.lineHeight = '1.6';
    listDiv.style.display = 'none'; // Свёрнут по умолчанию
    listDiv.style.maxHeight = '200px';
    listDiv.style.overflowY = 'auto';
    
    voters.forEach(name => {
        var nameSpan = document.createElement('div');
        nameSpan.textContent = name;
        nameSpan.style.padding = '4px 0';
        nameSpan.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        listDiv.appendChild(nameSpan);
    });
    
    votersListBlock.appendChild(header);
    votersListBlock.appendChild(listDiv);
    statusDiv.appendChild(votersListBlock);
    
    // Обработчик клика
    let isExpanded = false;
    header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        listDiv.style.display = isExpanded ? 'block' : 'none';
        toggleBtn.textContent = isExpanded ? '▲' : '▼';
    });
}

async function updateStatus() {
    var resp = await fetch(`${API}?action=voting_status`);
    var s = await resp.json();
    
    var txt = document.getElementById('viewerStatus');
    var stageRelax = document.getElementById('stageRelax');
    var stagePreparing = document.getElementById('stagePreparing');
    var stageVoting = document.getElementById('stageVoting');
    var voteControls = document.getElementById('voteControls');
    
    if (!txt) return;
    
    txt.className = 'status';
    
    if (s.status === 'voting') {
        txt.childNodes[0].nodeValue = '🎤 Голосование идёт';
        txt.classList.add('status-voting');
        if (stageVoting) stageVoting.style.display = 'flex';
        if (stagePreparing) stagePreparing.style.display = 'none';
        if (stageRelax) stageRelax.style.display = 'none';
        if (voteControls) voteControls.style.display = 'flex';
        
        if (!participantsLoaded && !hasVotedInThisFinal) {
            await loadParticipants();
        }
    } 
    else if (s.status === 'preparing') {
        txt.childNodes[0].nodeValue = '⏳ Голосование скоро начнётся';
        txt.classList.add('status-preparing');
        if (stageVoting) stageVoting.style.display = 'none';
        if (stagePreparing) stagePreparing.style.display = 'block';
        if (stageRelax) stageRelax.style.display = 'none';
        if (voteControls) voteControls.style.display = 'none';
        
        if (votersListBlock) votersListBlock.style.display = 'none';
    } 
    else if (s.status === 'relax') {
        txt.childNodes[0].nodeValue = '🏆 Голосование завершено';
        txt.classList.add('status-relax');
        if (stageVoting) stageVoting.style.display = 'none';
        if (stagePreparing) stagePreparing.style.display = 'none';
        if (stageRelax) stageRelax.style.display = 'block';
        if (voteControls) voteControls.style.display = 'none';
        await loadFinalTable();
        
        if (votersListBlock) votersListBlock.style.display = 'none';
    }
}

async function loadParticipants() {
    var resp = await fetch(`${API}?action=participants`, { headers: authHeader() });
    allParticipants = await resp.json();
    allParticipants.sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    available = allParticipants.slice();
    rows = POINTS.map(p => ({ points: p, participant: null }));
    renderScoreBoard();
    renderParticipantsBox();
    participantsLoaded = true;
}

function createParticipantCard(p) {
    var card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = p.id;
    card.setAttribute('draggable', 'true');
    
    var flag = 'flags/' + p.countryCode + '.jpg';
    
    var orderSpan = document.createElement('span');
    orderSpan.className = 'order';
    orderSpan.textContent = p.order;
    
    var img = document.createElement('img');
    img.src = flag;
    img.alt = p.countryCode;
    
    var infoDiv = document.createElement('div');
    infoDiv.className = 'info';
    
    var performerDiv = document.createElement('div');
    performerDiv.className = 'performer';
    performerDiv.textContent = p.performer;
    
    var songDiv = document.createElement('div');
    songDiv.className = 'song';
    songDiv.textContent = p.song;
    
    infoDiv.appendChild(performerDiv);
    infoDiv.appendChild(songDiv);
    
    card.appendChild(orderSpan);
    card.appendChild(img);
    card.appendChild(infoDiv);
    
    // Desktop drag (работает как обычно)
    card.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            id: p.id,
            type: 'participant',
            participant: p
        }));
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
        setTimeout(() => { card.classList.add('dragging-opacity'); }, 0);
    });
    
    card.addEventListener('dragend', function(e) {
        card.classList.remove('dragging');
        card.classList.remove('dragging-opacity');
    });
    
    // Mobile touch с долгим нажатием
    card.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        touchDrag.startX = touch.clientX;
        touchDrag.startY = touch.clientY;
        touchDrag.element = card;
        touchDrag.type = 'participant';
        touchDrag.data = { type: 'participant', participant: p };
        touchDrag.isDragging = false;
        
        // Запускаем таймер долгого нажатия
        touchDrag.longPressTimer = setTimeout(() => {
            if (touchDrag.element === card && !touchDrag.isDragging) {
                touchDrag.isDragging = true;
                e.preventDefault();
                card.classList.add('dragging-opacity');
                touchDrag.ghost = createGhost(touchDrag.data, touchDrag.startX, touchDrag.startY);
                document.body.appendChild(touchDrag.ghost);
            }
        }, LONG_PRESS_DELAY);
    });
    
    card.addEventListener('touchmove', function(e) {
        if (!touchDrag.element) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchDrag.startX);
        const dy = Math.abs(touch.clientY - touchDrag.startY);
        
        // Если палец сильно сдвинулся до долгого нажатия - отменяем
        if (!touchDrag.isDragging && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
            cancelLongPress();
            return;
        }
        
        if (touchDrag.isDragging && touchDrag.ghost) {
            e.preventDefault();
            touchDrag.ghost.style.left = (touch.clientX - 30) + 'px';
            touchDrag.ghost.style.top = (touch.clientY - 30) + 'px';
            
            const participantsBox = document.getElementById('participantsBox');
            const scoreBoard = document.querySelector('.score-board');
            if (participantsBox) checkAutoScroll(participantsBox, touch.clientY);
            if (scoreBoard) checkAutoScroll(scoreBoard, touch.clientY);
            
            let elemUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
            let target = null;
            let el = elemUnderTouch;
            while (el) {
                if (el.classList && el.classList.contains('score-target')) {
                    target = el;
                    break;
                }
                if (el.id === 'participantsBox') {
                    target = el;
                    break;
                }
                el = el.parentElement;
            }
            
            if (touchDrag.targetElement && touchDrag.targetElement !== target) {
                touchDrag.targetElement.classList.remove('drag-over');
            }
            touchDrag.targetElement = target;
            if (touchDrag.targetElement) {
                touchDrag.targetElement.classList.add('drag-over');
            }
        }
    });
    
    card.addEventListener('touchend', async function(e) {
        cancelLongPress();
        stopAutoScroll();
        
        if (touchDrag.ghost) {
            touchDrag.ghost.remove();
            touchDrag.ghost = null;
        }
        
        if (touchDrag.isDragging && touchDrag.targetElement && touchDrag.data) {
            e.preventDefault();
            
            if (touchDrag.targetElement.classList && touchDrag.targetElement.classList.contains('score-target')) {
                const idx = parseInt(touchDrag.targetElement.dataset.idx);
                if (!isNaN(idx)) {
                    const participant = touchDrag.data.participant;
                    if (rows[idx].participant) {
                        available.push(rows[idx].participant);
                    }
                    available = available.filter(p => p.id !== participant.id);
                    rows[idx].participant = participant;
                    await renderScoreBoard();
                    await renderParticipantsBox();
                    checkReady();
                }
            }
            else if (touchDrag.targetElement.id === 'participantsBox') {
                const participant = touchDrag.data.participant;
                let rowIdx = rows.findIndex(r => r.participant?.id === participant.id);
                if (rowIdx !== -1) {
                    rows[rowIdx].participant = null;
                    available.push(participant);
                    available.sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
                    await renderScoreBoard();
                    await renderParticipantsBox();
                    checkReady();
                }
            }
        }
        
        if (touchDrag.targetElement) {
            touchDrag.targetElement.classList.remove('drag-over');
        }
        
        if (touchDrag.element) {
            touchDrag.element.classList.remove('dragging-opacity');
        }
        
        resetTouchDrag();
    });
    
    // Обработчик для отмены при скролле
    card.addEventListener('touchcancel', function(e) {
        resetTouchDrag();
    });
    
    let dragOccurred = false;
    card.addEventListener('dragstart', function() { dragOccurred = true; });
    card.addEventListener('click', function(e) {
        if (dragOccurred) {
            dragOccurred = false;
            return;
        }
    });
    card.addEventListener('dragend', function() { setTimeout(() => { dragOccurred = false; }, 100); });
    
    return card;
}

function renderParticipantsBox() {
    var box = document.getElementById('participantsBox');
    if (!box) return;
    box.innerHTML = '';
    available.sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    available.forEach(p => {
        box.appendChild(createParticipantCard(p));
    });
    
    box.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        box.classList.add('drag-over');
    });
    
    box.addEventListener('dragleave', function() {
        box.classList.remove('drag-over');
    });
    
    box.addEventListener('drop', async function(e) {
        e.preventDefault();
        box.classList.remove('drag-over');
        
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        
        const data = JSON.parse(rawData);
        if (data.type === 'score') {
            const rowIdx = data.rowIdx;
            const participant = rows[rowIdx].participant;
            if (participant) {
                rows[rowIdx].participant = null;
                available.push(participant);
                await renderScoreBoard();
                await renderParticipantsBox();
                checkReady();
            }
        }
    });
}

function createScoreTarget(row, idx) {
    var target = document.createElement('div');
    target.className = 'score-target';
    target.dataset.idx = idx;
    
    if (row.participant) {
        var p = row.participant;
        var flag = 'flags/' + p.countryCode + '.jpg';
        target.innerHTML = '<img src="' + flag + '"><div class="info" style="display:flex;flex-direction:column;margin-left: 15px;"><div class="performer">' + p.performer + '</div><div class="song">' + p.song + '</div></div>';
        target.setAttribute('draggable', 'true');
        
        target.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'score',
                rowIdx: idx,
                points: row.points,
                participantId: p.id
            }));
            e.dataTransfer.effectAllowed = 'move';
            target.classList.add('dragging');
        });
        
        target.addEventListener('dragend', function() {
            target.classList.remove('dragging');
        });
        
        // Mobile touch для score-target с долгим нажатием
        target.addEventListener('touchstart', function(e) {
            const touch = e.touches[0];
            touchDrag.startX = touch.clientX;
            touchDrag.startY = touch.clientY;
            touchDrag.element = target;
            touchDrag.type = 'score';
            touchDrag.data = { type: 'score', rowIdx: idx, points: row.points };
            touchDrag.isDragging = false;
            
            touchDrag.longPressTimer = setTimeout(() => {
                if (touchDrag.element === target && !touchDrag.isDragging) {
                    touchDrag.isDragging = true;
                    e.preventDefault();
                    target.classList.add('dragging-opacity');
                    touchDrag.ghost = createGhost(touchDrag.data, touchDrag.startX, touchDrag.startY);
                    document.body.appendChild(touchDrag.ghost);
                }
            }, LONG_PRESS_DELAY);
        });
        
        target.addEventListener('touchmove', function(e) {
            if (!touchDrag.element) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchDrag.startX);
            const dy = Math.abs(touch.clientY - touchDrag.startY);
            
            if (!touchDrag.isDragging && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
                cancelLongPress();
                return;
            }
            
            if (touchDrag.isDragging && touchDrag.ghost) {
                e.preventDefault();
                touchDrag.ghost.style.left = (touch.clientX - 30) + 'px';
                touchDrag.ghost.style.top = (touch.clientY - 30) + 'px';
                
                const participantsBox = document.getElementById('participantsBox');
                const scoreBoard = document.querySelector('.score-board');
                if (participantsBox) checkAutoScroll(participantsBox, touch.clientY);
                if (scoreBoard) checkAutoScroll(scoreBoard, touch.clientY);
                
                let elemUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
                let targetEl = null;
                let el = elemUnderTouch;
                while (el) {
                    if (el.classList && el.classList.contains('score-target')) {
                        targetEl = el;
                        break;
                    }
                    if (el.id === 'participantsBox') {
                        targetEl = el;
                        break;
                    }
                    el = el.parentElement;
                }
                
                if (touchDrag.targetElement && touchDrag.targetElement !== targetEl) {
                    touchDrag.targetElement.classList.remove('drag-over');
                }
                touchDrag.targetElement = targetEl;
                if (touchDrag.targetElement) {
                    touchDrag.targetElement.classList.add('drag-over');
                }
            }
        });
        
        target.addEventListener('touchend', async function(e) {
            cancelLongPress();
            stopAutoScroll();
            
            if (touchDrag.ghost) {
                touchDrag.ghost.remove();
                touchDrag.ghost = null;
            }
            
            if (touchDrag.isDragging && touchDrag.targetElement && touchDrag.data) {
                e.preventDefault();
                
                if (touchDrag.targetElement.classList && touchDrag.targetElement.classList.contains('score-target')) {
                    const targetRowIdx = parseInt(touchDrag.targetElement.dataset.idx);
                    const sourceRowIdx = touchDrag.data.rowIdx;
                    const sourceParticipant = rows[sourceRowIdx].participant;
                    
                    if (sourceParticipant && !isNaN(targetRowIdx) && targetRowIdx !== sourceRowIdx) {
                        if (rows[targetRowIdx].participant) {
                            const targetParticipant = rows[targetRowIdx].participant;
                            rows[sourceRowIdx].participant = targetParticipant;
                            rows[targetRowIdx].participant = sourceParticipant;
                        } else {
                            rows[sourceRowIdx].participant = null;
                            rows[targetRowIdx].participant = sourceParticipant;
                        }
                        await renderScoreBoard();
                        await renderParticipantsBox();
                        checkReady();
                    }
                }
                else if (touchDrag.targetElement.id === 'participantsBox') {
                    const sourceRowIdx = touchDrag.data.rowIdx;
                    const sourceParticipant = rows[sourceRowIdx].participant;
                    if (sourceParticipant) {
                        rows[sourceRowIdx].participant = null;
                        available.push(sourceParticipant);
                        available.sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
                        await renderScoreBoard();
                        await renderParticipantsBox();
                        checkReady();
                    }
                }
            }
            
            if (touchDrag.targetElement) {
                touchDrag.targetElement.classList.remove('drag-over');
            }
            
            if (touchDrag.element) {
                touchDrag.element.classList.remove('dragging-opacity');
            }
            
            resetTouchDrag();
        });
        
        target.addEventListener('touchcancel', function(e) {
            resetTouchDrag();
        });
    } else {
        target.textContent = '—';
        target.setAttribute('draggable', 'false');
    }
    
    target.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        target.classList.add('drag-over');
    });
    
    target.addEventListener('dragleave', function() {
        target.classList.remove('drag-over');
    });
    
    target.addEventListener('drop', async function(e) {
        e.preventDefault();
        target.classList.remove('drag-over');
        
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        
        const data = JSON.parse(rawData);
        
        if (data.type === 'participant') {
            const participantId = data.id;
            const participant = available.find(p => p.id === participantId);
            if (!participant) return;
            if (rows[idx].participant) available.push(rows[idx].participant);
            available = available.filter(p => p.id !== participantId);
            rows[idx].participant = participant;
            await renderScoreBoard();
            await renderParticipantsBox();
            checkReady();
        }
        else if (data.type === 'score') {
            const sourceRowIdx = data.rowIdx;
            const sourceParticipant = rows[sourceRowIdx].participant;
            if (!sourceParticipant) return;
            if (rows[idx].participant) {
                const targetParticipant = rows[idx].participant;
                rows[sourceRowIdx].participant = targetParticipant;
                rows[idx].participant = sourceParticipant;
            } else {
                rows[sourceRowIdx].participant = null;
                rows[idx].participant = sourceParticipant;
            }
            await renderScoreBoard();
            await renderParticipantsBox();
            checkReady();
        }
    });
    
    return target;
}

function renderScoreBoard() {
    var container = document.getElementById('scoreBoardContainer');
    if (!container) return;
    container.innerHTML = '';
    
    rows.forEach((r, i) => {
        var rowDiv = document.createElement('div');
        rowDiv.className = 'score-row';
        
        var pointsDiv = document.createElement('div');
        pointsDiv.className = 'score-points';
        pointsDiv.textContent = r.points;
        rowDiv.appendChild(pointsDiv);
        
        var target = createScoreTarget(r, i);
        rowDiv.appendChild(target);
        
        container.appendChild(rowDiv);
    });
}

function checkReady() {
    var allFilled = rows.every(r => r.participant);
    var nameFilled = document.getElementById('viewerName').value.trim().length > 0;
    var sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = !(allFilled && nameFilled);
}

document.getElementById('viewerName')?.addEventListener('input', checkReady);

async function loadFinalTable() {
    try {
        const token = localStorage.getItem('token');
        var resp = await fetch(`${API}?action=voting_final_table&token=${token}`, { headers: authHeader() });
        if (resp.status === 204 || !resp.ok) return;
        var data = await resp.json();
        if (!data || !data.table || data.table.length === 0) return;
        renderFinalTableViewer(data);
    } catch(e) {}
}

function renderFinalTableViewer(finalData) {
    var container = document.getElementById('finalTableContainer');
    if (!container) return;
    container.innerHTML = '';
    
    var table = document.createElement('table');
    table.className = 'final-table';
    
    var thead = document.createElement('thead');
    var headTr = document.createElement('tr');
    var thCountry = document.createElement('th');
    thCountry.textContent = 'Страна';
    thCountry.className = 'left';
    headTr.appendChild(thCountry);
    var thSum = document.createElement('th');
    thSum.textContent = 'Сумма';
    thSum.className = 'left';
    headTr.appendChild(thSum);
    thead.appendChild(headTr);
    table.appendChild(thead);
    
    var tbody = document.createElement('tbody');
    var rowsData = finalData.table.map(row => {
        var total = 0;
        for (var vid in row.perViewer) total += row.perViewer[vid];
        return { row: row, total: total };
    }).sort((a, b) => b.total - a.total);
    
    rowsData.forEach((item, idx) => {
        var row = item.row;
        var tr = document.createElement('tr');
        if (idx === 0) tr.classList.add('gold');
        else if (idx === 1) tr.classList.add('silver');
        else if (idx === 2) tr.classList.add('bronze');
        
        var tdCountry = document.createElement('td');
        tdCountry.className = 'left';
        tdCountry.innerHTML = '<img src="' + row.flagUrl + '" width="24" style="vertical-align:middle;margin-right:4px;">' + row.country;
        tr.appendChild(tdCountry);
        
        var tdSum = document.createElement('td');
        tdSum.className = 'left';
        tdSum.textContent = item.total;
        tr.appendChild(tdSum);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

function setupDownload(btnId, containerId) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
        var el = document.getElementById(containerId);
        if (!el) return;
        html2canvas(el, { scale: 2, backgroundColor: '#FFEDD5' }).then(canvas => {
            canvas.toBlob(blob => {
                if (!blob) return;
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'final.png';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            });
        });
    });
}

setupDownload('downloadImgBtn', 'finalTableContainer');

document.getElementById('sendBtn').addEventListener('click', async function() {
    if (!confirm('Вы уверены, что хотите отправить свой голос?')) return;
    
    if (!rows.every(r => r.participant)) {
        showError('Заполните всю таблицу оценок');
        return;
    }
    
    var name = document.getElementById('viewerName').value.trim();
    if (!name) {
        showError('Введите ваше имя');
        return;
    }
    
    var sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Отправка...';
    
    var payload = { 
        name: name, 
        votes: rows.map(r => ({ participantId: r.participant.id, points: r.points }))
    };
    
    var resp = await fetch(`${API}?action=votes`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
        body: JSON.stringify(payload)
    });
    
    if (resp.status === 409) {
        var err = await resp.json();
        sendBtn.disabled = false;
        sendBtn.textContent = 'Отправить';
        
        var stageVoting = document.getElementById('stageVoting');
        var voteControls = document.getElementById('voteControls');
        if (stageVoting) stageVoting.style.display = 'none';
        if (voteControls) voteControls.style.display = 'none';
        
        var mainArea = document.querySelector('.main-area');
        if (mainArea) {
            mainArea.innerHTML = '';
            var errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="text-align:center;padding:40px 20px;">
                    <div style="font-size:48px;margin-bottom:20px;">⚠️</div>
                    <div style="font-size:24px;font-weight:bold;color:#d32f2f;margin-bottom:15px;">${err.error || 'Вы уже голосовали в этом финале!'}</div>
                    <div style="font-size:16px;color:#555;margin-bottom:25px;">Вы уже отправили свой голос. Результаты появятся после завершения голосования.</div>
                    <button id="refreshAfterErrorBtn" style="padding:10px 20px;background:#9e0517;color:white;border:none;border-radius:6px;cursor:pointer;">Обновить страницу</button>
                </div>
            `;
            mainArea.appendChild(errorDiv);
            document.getElementById('refreshAfterErrorBtn').addEventListener('click', () => location.reload());
        }
        return;
    }
    
    if (!resp.ok) {
        var err = await resp.json();
        showError(err.error || 'Ошибка при отправке');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Отправить';
        return;
    }
    
    var stageVoting = document.getElementById('stageVoting');
    var voteControls = document.getElementById('voteControls');
    if (stageVoting) stageVoting.style.display = 'none';
    if (voteControls) voteControls.style.display = 'none';
    
    var mainArea = document.querySelector('.main-area');
    if (mainArea) {
        mainArea.innerHTML = '';
        var successDiv = document.createElement('div');
        successDiv.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <div style="font-size:48px;margin-bottom:20px;">✅</div>
                <div style="font-size:24px;font-weight:bold;color:#2e7d32;margin-bottom:15px;">Ваш голос принят!</div>
                <div style="font-size:16px;color:#555;margin-bottom:25px;">Спасибо за участие в голосовании!</div>
                <button id="refreshAfterVoteBtn" style="padding:10px 20px;background:#9e0517;color:white;border:none;border-radius:6px;cursor:pointer;">Обновить страницу</button>
            </div>
        `;
        mainArea.appendChild(successDiv);
        document.getElementById('refreshAfterVoteBtn').addEventListener('click', () => location.reload());
    }
});

function showError(message) {
    var existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    var errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

async function init() {
    await loadVotersList();
    await updateStatus();
}

init();

setInterval(() => {
    updateStatus();
}, 3000);