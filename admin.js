const COUNTRIES = [
{code:'AL',name:'Albania'},{code:'AD',name:'Andorra'},{code:'AM',name:'Armenia'},
{code:'AU',name:'Australia'},{code:'AT',name:'Austria'},{code:'AZ',name:'Azerbaijan'},
{code:'BY',name:'Belarus'},{code:'BE',name:'Belgium'},{code:'BA',name:'Bosnia and Herzegovina'},
{code:'BG',name:'Bulgaria'},{code:'HR',name:'Croatia'},{code:'CY',name:'Cyprus'},
{code:'CZ',name:'Czech Republic'},{code:'DK',name:'Denmark'},{code:'EE',name:'Estonia'},
{code:'FI',name:'Finland'},{code:'FR',name:'France'},{code:'GE',name:'Georgia'},
{code:'DE',name:'Germany'},{code:'GR',name:'Greece'},{code:'HU',name:'Hungary'},
{code:'IS',name:'Iceland'},{code:'IE',name:'Ireland'},{code:'IL',name:'Israel'},
{code:'IT',name:'Italy'},{code:'LV',name:'Latvia'},{code:'LI',name:'Liechtenstein'},
{code:'LT',name:'Lithuania'},{code:'LU',name:'Luxembourg'},{code:'MT',name:'Malta'},
{code:'MC',name:'Monaco'},{code:'MD',name:'Moldova'},{code:'ME',name:'Montenegro'},
{code:'MK',name:'North Macedonia'},{code:'NL',name:'Netherlands'},{code:'NO',name:'Norway'},
{code:'PL',name:'Poland'},{code:'PT',name:'Portugal'},{code:'RO',name:'Romania'},
{code:'RU',name:'Russia'},{code:'SM',name:'San Marino'},{code:'RS',name:'Serbia'},{code:'SK',name:'Slovakia'},
{code:'SI',name:'Slovenia'},{code:'ES',name:'Spain'},{code:'SE',name:'Sweden'},
{code:'CH',name:'Switzerland'},{code:'TR',name:'Turkey'},{code:'GB',name:'United Kingdom'},{code:'UA',name:'Ukraine'}
];

function authHeader() {
  const token = localStorage.getItem('token');
  return { Authorization: 'Bearer ' + token };
}

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const countrySelect = document.getElementById('countrySelect');
const performerInput = document.getElementById('performerInput');
const songInput = document.getElementById('songInput');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
let editParticipant = null;

function hideAll() {
  document.getElementById('stageRelax').style.display = 'none';
  document.getElementById('stagePreparing').style.display = 'none';
  document.getElementById('stageVoting').style.display = 'none';
}
function showStageVoting() { hideAll(); document.getElementById('stageVoting').style.display = 'block'; }
function showStagePreparing() { hideAll(); document.getElementById('stagePreparing').style.display = 'block'; }
function showStageRelaxWithTable() {
  hideAll();
  document.getElementById('stageRelax').style.display = 'block';
  document.getElementById('relaxContent').style.display = 'block';
  document.getElementById('relaxEmpty').style.display = 'none';
}
function showStageRelaxEmpty() {
  hideAll();
  document.getElementById('stageRelax').style.display = 'block';
  document.getElementById('relaxContent').style.display = 'none';
  document.getElementById('relaxEmpty').style.display = 'block';
}

let participants = [];
async function loadParticipants() {
  const token = localStorage.getItem('token');
  let resp = await fetch(`${API}?action=participants&token=${token}`, { headers: authHeader() });
  participants = await resp.json();
  renderParticipantsList();
}

function fillCountrySelect(sel) {
  countrySelect.innerHTML = '';
  COUNTRIES.forEach(function(c) {
    let o = document.createElement('option');
    o.value = c.code;
    o.textContent = c.name + ' (' + c.code + ')';
    if (c.code === sel) o.selected = true;
    countrySelect.appendChild(o);
  });
}

function openEditModal(p) {
  editParticipant = p || null;
  modalTitle.textContent = p ? 'Редактировать участника' : 'Новый участник';
  fillCountrySelect(p ? p.countryCode : null);
  performerInput.value = p ? p.performer : '';
  songInput.value = p ? p.song : '';
  modalDeleteBtn.style.display = p ? 'inline-block' : 'none';
  modalOverlay.style.display = 'flex';
}
function closeModal() { modalOverlay.style.display = 'none'; editParticipant = null; }
document.getElementById('addParticipantBtn').addEventListener('click', function() { openEditModal(); });
modalCancelBtn.addEventListener('click', closeModal);
modalSaveBtn.addEventListener('click', async function() {
  let payload = {
    countryCode: countrySelect.value,
    country: COUNTRIES.filter(c => c.code === countrySelect.value)[0].name,
    flagUrl: 'flags/' + countrySelect.value + '.jpg',
    performer: performerInput.value.trim(),
    song: songInput.value.trim(),
    order: editParticipant ? editParticipant.order : participants.length + 1
  };
  if (!payload.performer || !payload.song) { alert('Заполните «Исполнитель» и «Песня»'); return; }
  try {
    const token = localStorage.getItem('token');
    if (editParticipant) {
      await fetch(`${API}?action=participants_update&id=${editParticipant.id}&token=${token}`, {
        method: 'PUT',
        headers: Object.assign({'Content-Type': 'application/json'}, authHeader()),
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${API}?action=participants&token=${token}`, {
        method: 'POST',
        headers: Object.assign({'Content-Type': 'application/json'}, authHeader()),
        body: JSON.stringify(payload)
      });
    }
    await loadParticipants();
    closeModal();
  } catch(e) { console.error(e); alert('Ошибка при сохранении'); }
});
modalDeleteBtn.addEventListener('click', async function() {
  if (!editParticipant) return;
  if (!confirm('Точно удалить?')) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`${API}?action=participants_delete&id=${editParticipant.id}&token=${token}`, {
      method: 'DELETE',
      headers: authHeader()
    });
    await loadParticipants();
    await saveNewOrder();
    closeModal();
  } catch(e) { console.error(e); alert('Ошибка при удалении'); }
});

// ========== АВТОСКРОЛЛ ПРИ ПЕРЕТАСКИВАНИИ ==========
let autoScrollInterval = null;
let lastDragY = 0;
let isDraggingCard = false;

function getScrollThreshold() {
    return window.innerHeight * 0.15; // 15% от высоты окна
}

function startAutoScroll(mouseY) {
    if (autoScrollInterval) stopAutoScroll();
    
    autoScrollInterval = setInterval(() => {
        if (!isDraggingCard) {
            stopAutoScroll();
            return;
        }
        
        const scrollThreshold = getScrollThreshold();
        const mouseYRelative = lastDragY;
        
        // Верхняя граница
        if (mouseYRelative < scrollThreshold) {
            const speed = Math.max(5, (scrollThreshold - mouseYRelative) / 10);
            window.scrollBy(0, -speed);
        }
        // Нижняя граница
        else if (mouseYRelative > window.innerHeight - scrollThreshold) {
            const distance = mouseYRelative - (window.innerHeight - scrollThreshold);
            const speed = Math.max(5, distance / 10);
            window.scrollBy(0, speed);
        }
    }, 16); // ~60fps
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Обновляем позицию мыши при движении
document.addEventListener('dragover', function(e) {
    if (isDraggingCard) {
        lastDragY = e.clientY;
    }
});

// ========== DRAG&DROP НА ВСЕЙ КАРТОЧКЕ ==========

function createCard(p) {
  var el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = p.id;
  el.setAttribute('draggable', 'true');
  
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
  
  el.appendChild(orderSpan);
  el.appendChild(img);
  el.appendChild(infoDiv);
  
  // --- Drag Start ---
  el.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/plain', String(p.id));
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
    isDraggingCard = true;
    lastDragY = e.clientY;
    startAutoScroll(e.clientY);
    setTimeout(() => { el.classList.add('dragging-opacity'); }, 0);
  });
  
  // --- Drag End ---
  el.addEventListener('dragend', function(e) {
    el.classList.remove('dragging');
    el.classList.remove('dragging-opacity');
    isDraggingCard = false;
    stopAutoScroll();
  });
  
  // --- Drag Over ---
  el.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });
  
  el.addEventListener('dragleave', function() {
    el.classList.remove('drag-over');
  });
  
  // --- Drop: СДВИГ, а не обмен ---
  el.addEventListener('drop', async function(e) {
    e.preventDefault();
    el.classList.remove('drag-over');
    
    const srcId = e.dataTransfer.getData('text/plain');
    const targetId = String(p.id);
    
    if (srcId === targetId) return;
    
    const srcIdx = participants.findIndex(item => String(item.id) === srcId);
    const targetIdx = participants.findIndex(item => String(item.id) === targetId);
    
    if (srcIdx === -1 || targetIdx === -1) return;
    
    // ПРАВИЛЬНЫЙ СДВИГ: удаляем элемент из srcIdx и вставляем на targetIdx
    const [movedItem] = participants.splice(srcIdx, 1);
    participants.splice(targetIdx, 0, movedItem);
    
    await saveNewOrder();
  });
  
  // --- Click (открытие модалки) ---
  let dragOccurred = false;
  
  el.addEventListener('dragstart', function() {
    dragOccurred = true;
  });
  
  el.addEventListener('click', function(e) {
    if (dragOccurred) {
      dragOccurred = false;
      return;
    }
    openEditModal(p);
  });
  
  el.addEventListener('dragend', function() {
    setTimeout(() => { dragOccurred = false; }, 100);
  });
  
  return el;
}

function renderParticipantsList() {
  var container = document.getElementById('participantsContainer');
  if (!container) return;
  container.innerHTML = '';
  participants.sort(function(a, b) { return a.order - b.order; });
  participants.forEach(function(p) { container.appendChild(createCard(p)); });
}

async function saveNewOrder() {
  participants.forEach(function(p, i) { p.order = i + 1; });
  
  const token = localStorage.getItem('token');
  await Promise.all(participants.map(function(p) {
    return fetch(`${API}?action=participants_update&id=${p.id}&token=${token}`, {
      method: 'PUT',
      headers: Object.assign({'Content-Type': 'application/json'}, authHeader()),
      body: JSON.stringify({
        countryCode: p.countryCode,
        country: p.country,
        flagUrl: p.flagUrl,
        performer: p.performer,
        song: p.song,
        order: p.order
      })
    });
  }));
  
  renderParticipantsList();
}

let currentStatus = null;
let votersListInterval = null;

async function loadVotersList() {
    try {
        const token = localStorage.getItem('token');
        var resp = await fetch(`${API}?action=voters_list`, { 
            headers: authHeader() 
        });
        if (resp.ok) {
            var voters = await resp.json();
            renderVotersListForAdmin(voters);
        }
    } catch(e) {
        console.error('Failed to load voters list:', e);
    }
}

function renderVotersListForAdmin(voters) {
    var container = document.getElementById('votersListContainer');
    var listDiv = document.getElementById('votersList');
    
    if (!container || !listDiv) return;
    
    if (voters.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    var namesList = voters.map((name, index) => `${index + 1}. ${name}`).join('<br>');
    listDiv.innerHTML = namesList;
}

async function updateAdminStatus() {
  var resp = await fetch(`${API}?action=voting_status`, { headers: authHeader() });
  var s = await resp.json();
  document.getElementById('adminStatus').textContent = 'Статус: ' + s.status;
  document.getElementById('votedCount').textContent = s.votedCount || 0;
  currentStatus = s.status;
  
  if (s.status === 'voting') {
      await loadVotersList();
      if (votersListInterval) clearInterval(votersListInterval);
      votersListInterval = setInterval(() => {
          if (currentStatus === 'voting') {
              loadVotersList();
          } else {
              if (votersListInterval) clearInterval(votersListInterval);
          }
      }, 5000);
  } else {
      var container = document.getElementById('votersListContainer');
      if (container) container.style.display = 'none';
      if (votersListInterval) {
          clearInterval(votersListInterval);
          votersListInterval = null;
      }
  }
}

document.getElementById('startBtn').addEventListener('click', async function() {
  if (!confirm('Вы уверены, что хотите запустить голосование?')) return;
  await fetch(`${API}?action=voting_start`, { method: 'POST', headers: authHeader() });
  await updateAdminStatus();
  showStageVoting();
});

document.getElementById('closeBtn').addEventListener('click', async function() {
  if (!confirm('Вы уверены, что хотите завершить голосование?')) return;
  try {
    let resp = await fetch(`${API}?action=voting_close`, { method: 'POST', headers: authHeader() });
    if (!resp.ok) { let txt = await resp.text(); alert('Не удалось закрыть голосование. Код ' + resp.status + ': ' + txt); return; }
    
    if (votersListInterval) {
        clearInterval(votersListInterval);
        votersListInterval = null;
    }
    
    await updateAdminStatus();
    await loadFinalTable();
  } catch(e) { console.error(e); alert('Ошибка при закрытии голосования'); }
});

let finalData = null;
let visibleViewerIds = [];
let zeroVotesSet = new Set();

async function loadZeroVotesSet() {
  try {
    let resp = await fetch(`${API}?action=votes`, { headers: authHeader() });
    if (!resp.ok) return;
    let votes = await resp.json();
    zeroVotesSet.clear();
    votes.forEach(v => {
      v.votes.forEach(vt => {
        if (vt.points === 0) zeroVotesSet.add(v.viewerId + '_' + vt.participantId);
      });
    });
  } catch(_) {}
}

function renderFinalTable(containerId, toggleId) {
  var container = document.getElementById(containerId);
  var toggleDiv = document.getElementById(toggleId);
  if (!container || !toggleDiv) return;
  container.innerHTML = '';
  toggleDiv.innerHTML = '';
  if (!finalData || !finalData.viewerInfo || !finalData.table) return;
  var viewerInfo = finalData.viewerInfo || [];
  if (!visibleViewerIds || visibleViewerIds.length === 0) {
    visibleViewerIds = viewerInfo.map(function(v) { return String(v.id); });
  }
  viewerInfo.forEach(function(v) {
    var label = document.createElement('label');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    var idStr = String(v.id);
    cb.checked = visibleViewerIds.indexOf(idStr) !== -1;
    cb.dataset.id = idStr;
    cb.addEventListener('change', function() {
      var id = cb.dataset.id;
      if (cb.checked) {
        if (visibleViewerIds.indexOf(id) === -1) visibleViewerIds.push(id);
      } else {
        visibleViewerIds = visibleViewerIds.filter(function(i) { return i !== id; });
      }
      renderFinalTable(containerId, toggleId);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (v.name || 'Зритель ' + (viewerInfo.indexOf(v) + 1))));
    toggleDiv.appendChild(label);
    toggleDiv.appendChild(document.createElement('br'));
  });
  var table = document.createElement('table');
  table.className = 'final-table';
  var thead = document.createElement('thead');
  var headTr = document.createElement('tr');
  var thCountry = document.createElement('th');
  thCountry.textContent = 'Страна';
  thCountry.className = 'left';
  headTr.appendChild(thCountry);
  viewerInfo.forEach(function(v) {
    if (visibleViewerIds.indexOf(String(v.id)) === -1) return;
    var th = document.createElement('th');
    th.textContent = v.name || 'Зритель ' + (viewerInfo.indexOf(v) + 1);
    th.className = 'center';
    headTr.appendChild(th);
  });
  var thSum = document.createElement('th');
  thSum.textContent = 'Сумма';
  thSum.className = 'left';
  headTr.appendChild(thSum);
  thead.appendChild(headTr);
  table.appendChild(thead);
  var tbody = document.createElement('tbody');
  var rows = finalData.table.map(function(row) {
    var total = 0;
    visibleViewerIds.forEach(function(id) { total += (row.perViewer[id] || 0); });
    return { row: row, total: total };
  }).sort(function(a, b) { return b.total - a.total; });
  rows.forEach(function(item, idx) {
    var row = item.row;
    var tr = document.createElement('tr');
    if (idx === 0) tr.classList.add('gold');
    else if (idx === 1) tr.classList.add('silver');
    else if (idx === 2) tr.classList.add('bronze');
    var tdCountry = document.createElement('td');
    tdCountry.className = 'left';
    tdCountry.innerHTML = '<img src="' + row.flagUrl + '" width="24" style="vertical-align:middle;margin-right:4px;">' + row.country;
    tr.appendChild(tdCountry);
    viewerInfo.forEach(function(v) {
      if (visibleViewerIds.indexOf(String(v.id)) === -1) return;
      var td = document.createElement('td');
      td.className = 'center';
      var pts = row.perViewer[v.id];
      if (pts !== undefined) {
        td.textContent = pts;
        if (pts === 0 && zeroVotesSet.has(v.id + '_' + row.participantId)) td.classList.add('zero');
      } else {
        td.textContent = '0';
      }
      tr.appendChild(td);
    });
    var tdSum = document.createElement('td');
    tdSum.className = 'left';
    tdSum.textContent = item.total;
    tr.appendChild(tdSum);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

async function loadFinalTable() {
  try {
    const token = localStorage.getItem('token');
    var resp = await fetch(`${API}?action=voting_final_table&token=${token}`, { headers: authHeader() });
    if (resp.status === 204) {
      showStageRelaxEmpty();
      return false;
    }
    if (!resp.ok) {
      showStageRelaxEmpty();
      return false;
    }
    var data = await resp.json();
    if (!data || !data.table || data.table.length === 0) {
      showStageRelaxEmpty();
      return false;
    }
    finalData = data;
    await loadZeroVotesSet();
    renderFinalTable('finalTableContainer', 'columnToggle');
    showStageRelaxWithTable();
    return true;
  } catch(e) {
    console.error(e);
    showStageRelaxEmpty();
    return false;
  }
}

function setupDownload(btnId, containerId) {
  let btn = document.getElementById(btnId);
  if (!btn) return;
  
  btn.addEventListener('click', async function() {
    let originalContainer = document.getElementById(containerId);
    if (!originalContainer || !originalContainer.children.length) return;
    
    let originalOverflow = originalContainer.style.overflow;
    let originalMaxWidth = originalContainer.style.maxWidth;
    let originalWidth = originalContainer.style.width;
    
    originalContainer.style.overflow = 'visible';
    originalContainer.style.maxWidth = 'none';
    originalContainer.style.width = 'max-content';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const canvas = await html2canvas(originalContainer, {
        scale: 2,
        backgroundColor: '#FFEDD5',
        useCORS: true,
        logging: false,
        windowWidth: originalContainer.scrollWidth,
        windowHeight: originalContainer.scrollHeight
      });
      
      canvas.toBlob(blob => {
        if (!blob) return;
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'final.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      });
    } catch(e) {
      console.error('html2canvas error:', e);
      alert('Ошибка при создании скриншота');
    } finally {
      originalContainer.style.overflow = originalOverflow;
      originalContainer.style.maxWidth = originalMaxWidth;
      originalContainer.style.width = originalWidth;
    }
  });
}

setupDownload('downloadImgBtn', 'finalTableContainer');

document.getElementById('newFinalBtn').addEventListener('click', async function() {
  await fetch(`${API}?action=voting_reset`, { method: 'POST', headers: authHeader() });
  
  if (votersListInterval) {
      clearInterval(votersListInterval);
      votersListInterval = null;
  }
  
  participants = [];
  await loadParticipants();
  showStagePreparing();
});

document.getElementById('newFinalBtnEmpty')?.addEventListener('click', async function() {
  await fetch(`${API}?action=voting_reset`, { method: 'POST', headers: authHeader() });
  
  if (votersListInterval) {
      clearInterval(votersListInterval);
      votersListInterval = null;
  }
  
  participants = [];
  await loadParticipants();
  showStagePreparing();
});

async function checkStatusAndShow() {
  let resp = await fetch(`${API}?action=voting_status`, { headers: authHeader() });
  let s = await resp.json();
  
  if (s.status === 'voting') {
    await updateAdminStatus();
    showStageVoting();
  } else if (s.status === 'preparing') {
    await loadParticipants();
    showStagePreparing();
    if (votersListInterval) {
        clearInterval(votersListInterval);
        votersListInterval = null;
    }
  } else if (s.status === 'relax') {
    await loadFinalTable();
    if (votersListInterval) {
        clearInterval(votersListInterval);
        votersListInterval = null;
    }
  } else {
    await loadParticipants();
    showStagePreparing();
  }
}

checkStatusAndShow();