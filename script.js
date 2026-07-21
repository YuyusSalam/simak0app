// ============================================
// SUPABASE CLIENT
// ============================================
// PENTING: hanya pakai anon/publishable key di sini.
// JANGAN PERNAH taruh SUPABASE_SECRET_KEY di file yang jalan di browser.
const SUPABASE_URL = 'https://hyjihoyizicqoyhqxgkd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QLamOF5Ako8MZwafMLY5Rw_TO2TcA9l';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// SUPABASE HELPERS (generic query wrapper)
// ============================================

async function sbSelect(table, opts = {}) {
    let q = sb.from(table).select(opts.select || '*');
    if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
    if (opts.neq) for (const [k, v] of Object.entries(opts.neq)) q = q.neq(k, v);
    if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending !== false });
    const { data, error } = await q;
    if (error) { console.error('[sbSelect:' + table + ']', error); return []; }
    return data || [];
}

async function sbInsert(table, row) {
    const { data, error } = await sb.from(table).insert(row).select();
    if (error) { console.error('[sbInsert:' + table + ']', error); showToast('Gagal menyimpan data: ' + error.message, 'error'); return null; }
    return data[0];
}

async function sbUpdate(table, matchObj, updates) {
    let q = sb.from(table).update(updates);
    for (const [k, v] of Object.entries(matchObj)) q = q.eq(k, v);
    const { data, error } = await q.select();
    if (error) { console.error('[sbUpdate:' + table + ']', error); showToast('Gagal update data: ' + error.message, 'error'); return null; }
    return data;
}

async function sbDelete(table, matchObj) {
    let q = sb.from(table).delete();
    for (const [k, v] of Object.entries(matchObj)) q = q.eq(k, v);
    const { error } = await q;
    if (error) { console.error('[sbDelete:' + table + ']', error); showToast('Gagal hapus data: ' + error.message, 'error'); return false; }
    return true;
}

async function sbUpsert(table, row, onConflict) {
    const { data, error } = await sb.from(table).upsert(row, { onConflict }).select();
    if (error) { console.error('[sbUpsert:' + table + ']', error); showToast('Gagal simpan: ' + error.message, 'error'); return null; }
    return data[0];
}

async function getMessagesBetween(a, b) {
    const { data, error } = await sb.from('messages')
        .select('*')
        .or(`and(from_user.eq.${a},to_user.eq.${b}),and(from_user.eq.${b},to_user.eq.${a})`)
        .order('timestamp', { ascending: true });
    if (error) { console.error('[getMessagesBetween]', error); return []; }
    return data || [];
}

// ============================================
// UTILITIES (sesi login tetap di localStorage — bukan data master)
// ============================================

function generateId() { return Date.now() + Math.random().toString(36).substr(2, 9); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
function timeToMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'i'}</div>
        <div class="toast-text">${message}</div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 300);
}

// ============================================
// CONFIRM CARD
// ============================================

let confirmCallbackYes = null;
let confirmCallbackNo = null;

function showConfirm(message, onYes, options = {}) {
    const title = options.title || 'Konfirmasi';
    const icon = options.icon || 'warn';
    const iconText = options.iconText || '?';
    const yesText = options.yesText || 'Ya, Lanjutkan';
    const noText = options.noText || 'Batal';
    const yesClass = options.yesClass || 'btn-primary';
    const onNo = options.onNo || null;

    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').innerHTML = message;
    document.getElementById('confirmIcon').className = 'confirm-card-icon ' + icon;
    document.getElementById('confirmIcon').textContent = iconText;
    document.getElementById('confirmYes').textContent = yesText;
    document.getElementById('confirmYes').className = 'btn ' + yesClass;
    document.getElementById('confirmNo').textContent = noText;

    confirmCallbackYes = onYes;
    confirmCallbackNo = onNo;
    document.getElementById('confirmModal').classList.add('show');
}

function closeConfirm(result) {
    document.getElementById('confirmModal').classList.remove('show');
    if (result && confirmCallbackYes) {
        confirmCallbackYes();
    } else if (!result && confirmCallbackNo) {
        confirmCallbackNo();
    }
    confirmCallbackYes = null;
    confirmCallbackNo = null;
}

// ============================================
// CLOCK
// ============================================

function updateClock() {
    const now = new Date();
    const ts = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ds = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ['topbarClock', 'topbarClockDosen', 'topbarClockAdmin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = ts;
    });
    const d = document.getElementById('pageDate');
    if (d) d.textContent = ds;
}
setInterval(updateClock, 1000);
updateClock();

// ============================================
// LOGIN
// ============================================

let currentLoginRole = 'keti';

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentLoginRole = this.dataset.role;
    });
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;

    if (currentLoginRole === 'admin') {
        if (u === 'admin' && p === '123') {
            setCurrentUser({ role: 'admin', username: 'admin', name: 'Admin' });
            showPage('adminDashboard');
            loadAdminPanel();
        } else showToast('Username atau password salah!', 'error');
    } else if (currentLoginRole === 'keti') {
        const rows = await sbSelect('keti_users', { eq: { username: u, password: p } });
        const user = rows[0];
        if (user) {
            setCurrentUser({ role: 'keti', username: user.username, name: user.name });
            document.getElementById('ketiName').textContent = user.name;
            document.getElementById('ketiAvatar').textContent = user.name.charAt(0).toUpperCase();
            showPage('ketiDashboard');
            loadKetiDashboard();
        } else showToast('Username atau password salah!', 'error');
    } else {
        const rows = await sbSelect('dosen_users', { eq: { username: u, password: p } });
        const user = rows[0];
        if (user) {
            setCurrentUser({ role: 'dosen', username: user.username, name: user.name });
            document.getElementById('dosenDisplayName').textContent = user.name;
            document.getElementById('dosenAvatar').textContent = user.name.charAt(0).toUpperCase();
            showPage('dosenDashboard');
            loadDosenDashboard();
        } else showToast('Username atau password salah!', 'error');
    }
});

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function logout() {
    localStorage.removeItem('currentUser');
    showPage('loginPage');
    document.getElementById('loginForm').reset();
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// ============================================
// NAVIGATION
// ============================================

const pageTitles = {
    cekRuangan: 'Cek Ruangan', checkin: 'Check-in Ruangan', checkout: 'Check-out',
    jadwalTetap: 'Jadwal Tetap', absensi: 'Absensi Mahasiswa', chat: 'Chat', kelasSaya: 'Kelas Saya',
    chatDosen: 'Chat Keti', manageKeti: 'Kelola Keti', manageDosen: 'Kelola Dosen', manageRooms: 'Kelola Ruangan'
};

document.querySelectorAll('.sb-link').forEach(btn => {
    btn.addEventListener('click', function() {
        const page = this.closest('.page');
        page.querySelectorAll('.sb-link').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        page.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(this.dataset.view + 'View').classList.add('active');

        const t = document.getElementById('pageTitle') || document.getElementById('dosenPageTitle');
        if (t && pageTitles[this.dataset.view]) t.textContent = pageTitles[this.dataset.view];

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        const v = this.dataset.view;
        if (v === 'cekRuangan') loadRooms();
        if (v === 'checkin') loadCheckin();
        if (v === 'checkout') loadCheckout();
        if (v === 'jadwalTetap') loadJadwalTetap();
        if (v === 'absensi') loadAbsensi();
        if (v === 'chat') loadChat();
        if (v === 'kelasSaya') loadKelasDosen();
        if (v === 'chatDosen') loadChatDosen();
        if (v === 'manageKeti') loadKetiTable();
        if (v === 'manageDosen') loadDosenTable();
        if (v === 'manageRooms') loadRoomTable();
    });
});

// ============================================
// KETI DASHBOARD
// ============================================

function loadKetiDashboard() {
    loadRooms();
    checkAutoCheckout();
    autoBookJadwalTetapHariIni();
    setInterval(checkAutoCheckout, 10000);
    // Auto-refresh tampilan Cek Ruangan setiap 5 detik
    setInterval(function() {
        if (document.getElementById('cekRuanganView').classList.contains('active')) {
            loadRooms();
        }
    }, 5000);
}

// ============================================
// CEK RUANGAN
// ============================================

let currentFilter = 'all';

document.querySelectorAll('.fbtn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        loadRooms();
    });
});

async function loadRooms() {
    const rooms = await sbSelect('rooms', { order: { column: 'id' } });
    const checkins = await sbSelect('checkins', { neq: { status: 'checkout' } });
    const el = document.getElementById('roomList');
    let counts = { total: rooms.length, free: 0, active: 0, booked: 0 };
    let html = '';

    rooms.forEach(room => {
        const roomCis = checkins.filter(c => c.room_id === room.id)
            .sort((a, b) => timeToMinutes(a.checkin_time) - timeToMinutes(b.checkin_time));
        // Prioritaskan sesi yang sedang berlangsung, kalau tidak ada pakai booking terdekat berikutnya
        const ci = roomCis.find(c => c.status === 'checkedin') || roomCis[0];
        const extraCount = roomCis.length - (ci ? 1 : 0);
        let status = 'kosong', label = 'Kosong', detail = '';

        if (ci) {
            if (ci.status === 'booked') {
                status = 'booked'; label = 'Booked'; counts.booked++;
                detail = `<p><strong>Keti:</strong> ${ci.keti_name}</p><p><strong>Kelas:</strong> ${ci.kelas}</p><p><strong>Jadwal:</strong> ${ci.checkin_time} – ${ci.checkout_time}</p><p class="booked-note">Menunggu masuk</p>`;
            } else if (ci.status === 'checkedin') {
                status = 'berlangsung'; label = 'Berlangsung'; counts.active++;
                detail = `<p><strong>Keti:</strong> ${ci.keti_name}</p><p><strong>Kelas:</strong> ${ci.kelas}</p><p><strong>Dosen:</strong> ${ci.dosen_name}</p><p><strong>Matkul:</strong> ${ci.mata_kuliah}</p><p><strong>Checkout:</strong> ${ci.checkout_time}</p>${ci.mode === 'zoom' ? '<span class="zoom-tag">ZOOM</span>' : ''}`;
            }
            if (extraCount > 0) {
                detail += `<p class="booked-note">+${extraCount} jadwal lain hari ini</p>`;
            }
        } else { counts.free++; }

        if (currentFilter !== 'all' && currentFilter !== status) return;

        html += `
            <div class="room-card status-${status}" onclick="handleRoomClick(${room.id}, '${status}')" style="cursor:pointer;">
                <div class="room-card-head">
                    <h4>${room.name}</h4>
                    <span class="room-tag">${label}</span>
                </div>
                <div class="room-meta">
                    <span>Lantai ${room.floor}</span>
                    <span class="${room.type === 'lab' ? 'type-lab' : ''}">${room.type === 'lab' ? 'Lab' : 'Kelas'}</span>
                </div>
                <div class="room-detail">${detail}</div>
            </div>`;
    });

    el.innerHTML = html || '<p class="no-data">Tidak ada ruangan sesuai filter</p>';
    document.getElementById('statTotal').textContent = counts.total;
    document.getElementById('statFree').textContent = counts.free;
    document.getElementById('statActive').textContent = counts.active;
    document.getElementById('statBooked').textContent = counts.booked;
}

// Room card click handler
function handleRoomClick(roomId, status) {
    if (status === 'kosong') {
        navigateToCheckinWithRoom(roomId);
    } else {
        showRoomDetail(roomId);
    }
}

function navigateToCheckinWithRoom(roomId) {
    // Navigate to check-in view
    const page = document.getElementById('ketiDashboard');
    page.querySelectorAll('.sb-link').forEach(b => b.classList.remove('active'));
    page.querySelector('[data-view="checkin"]').classList.add('active');
    page.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('checkinView').classList.add('active');

    const t = document.getElementById('pageTitle');
    if (t) t.textContent = 'Check-in Ruangan';

    loadCheckin();

    // Pre-select the room after a short delay to ensure the form is loaded
    setTimeout(() => {
        const sel = document.getElementById('checkinRoom');
        if (sel) {
            sel.value = roomId;
        }
    }, 200);
}

async function showRoomDetail(roomId) {
    const cis = await sbSelect('checkins', { eq: { room_id: roomId }, neq: { status: 'checkout' } });
    const ci = cis[0];
    const rooms = await sbSelect('rooms', { eq: { id: roomId } });
    const room = rooms[0];

    if (!ci || !room) return;

    const badge = ci.status === 'booked'
        ? '<span class="room-tag" style="background:var(--sky-bg);color:var(--sky);">BOOKED</span>'
        : '<span class="room-tag" style="background:var(--amber-bg);color:var(--amber);">BERLANGSUNG</span>';

    document.getElementById('rdTitle').textContent = room.name;
    document.getElementById('rdBadge').innerHTML = badge;
    document.getElementById('rdBody').innerHTML = `
        <p><strong>Status:</strong> ${ci.status === 'booked' ? 'Booked (belum masuk)' : 'Berlangsung'}</p>
        <p><strong>Keti:</strong> ${ci.keti_name} (${ci.angkatan})</p>
        <p><strong>Kelas:</strong> ${ci.kelas}</p>
        <p><strong>Dosen:</strong> ${ci.dosen_name}</p>
        <p><strong>Matkul:</strong> ${ci.mata_kuliah}</p>
        <p><strong>Jadwal:</strong> ${ci.checkin_time} – ${ci.checkout_time}</p>
        <p><strong>Mode:</strong> ${ci.mode === 'zoom' ? 'Zoom' : 'Offline'}</p>
        ${ci.status === 'booked' ? '<p style="color:var(--sky);margin-top:8px;"><em>Menunggu keti & mahasiswa masuk</em></p>' : ''}
    `;

    document.getElementById('roomDetailModal').classList.add('show');
}

function closeRoomDetail() {
    document.getElementById('roomDetailModal').classList.remove('show');
}

// ============================================
// CHECK-IN
// ============================================

async function loadCheckin() {
    const user = getCurrentUser();
    const profiles = await sbSelect('profiles', { eq: { username: user.username } });
    const profile = profiles[0];
    if (profile) {
        document.getElementById('bioProfileSection').style.display = 'none';
        document.getElementById('checkinSection').style.display = 'block';
        document.getElementById('displayName').textContent = profile.name;
        document.getElementById('displayAngkatan').textContent = 'Angkatan ' + profile.angkatan;
        document.getElementById('displayKelas').textContent = profile.kelas;
        document.getElementById('checkinAvatar').textContent = profile.name.charAt(0).toUpperCase();
        await loadAvailableRooms();
        await loadDosenDropdown();
    } else {
        document.getElementById('bioProfileSection').style.display = 'block';
        document.getElementById('checkinSection').style.display = 'none';
    }
}

async function loadDosenDropdown() {
    const dosens = await sbSelect('dosen_users');
    const sel = document.getElementById('dosenDropdown');
    sel.innerHTML = '<option value="">-- Pilih dari daftar --</option>';
    dosens.forEach(d => { sel.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
}

document.getElementById('dosenDropdown').addEventListener('change', function() {
    if (this.value) document.getElementById('dosenName').value = this.value;
});

document.getElementById('dosenName').addEventListener('input', function() {
    const dd = document.getElementById('dosenDropdown');
    let found = false;
    for (let o of dd.options) { if (o.value === this.value) { dd.value = this.value; found = true; break; } }
    if (!found) dd.value = '';
});

document.getElementById('bioForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = getCurrentUser();
    await sbUpsert('profiles', {
        username: user.username,
        name: document.getElementById('ketiNameInput').value,
        angkatan: document.getElementById('ketiAngkatan').value,
        kelas: document.getElementById('ketiKelas').value
    }, 'username');
    await loadCheckin();
});

let cachedRoomsForCheckin = [];
let cachedTodayCheckinsForCheckin = [];

function timesOverlap(startA, endA, startB, endB) {
    return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

async function loadAvailableRooms() {
    const today = new Date().toISOString().split('T')[0];
    cachedRoomsForCheckin = await sbSelect('rooms', { order: { column: 'id' } });
    const checkins = await sbSelect('checkins', { neq: { status: 'checkout' } });
    cachedTodayCheckinsForCheckin = checkins.filter(c => c.date === today);
    renderRoomOptions();
}

function renderRoomOptions() {
    const sel = document.getElementById('checkinRoom');
    if (!sel) return;
    const prevValue = sel.value;
    const ciTime = document.getElementById('checkinTime').value;
    const coTime = document.getElementById('checkoutTime').value;
    const hasTimeRange = ciTime && coTime && timeToMinutes(coTime) > timeToMinutes(ciTime);

    sel.innerHTML = '<option value="">-- Pilih Ruangan --</option>';
    cachedRoomsForCheckin.forEach(r => {
        const roomBookings = cachedTodayCheckinsForCheckin.filter(c => c.room_id === r.id);
        const roomLabel = `${r.name} — Lantai ${r.floor} (${r.type === 'lab' ? 'Lab' : 'Kelas'})`;

        if (hasTimeRange) {
            const conflict = roomBookings.find(c => timesOverlap(ciTime, coTime, c.checkin_time, c.checkout_time));
            if (conflict) {
                sel.innerHTML += `<option value="${r.id}" disabled>${roomLabel} — bentrok ${conflict.checkin_time}–${conflict.checkout_time}</option>`;
            } else {
                sel.innerHTML += `<option value="${r.id}">${roomLabel}</option>`;
            }
        } else {
            // Jam belum diisi: tampilkan semua ruangan, beri info jika sudah ada jadwal lain hari ini
            if (roomBookings.length > 0) {
                const jadwalList = roomBookings.map(c => `${c.checkin_time}–${c.checkout_time}`).join(', ');
                sel.innerHTML += `<option value="${r.id}">${roomLabel} (sudah ada jadwal: ${jadwalList})</option>`;
            } else {
                sel.innerHTML += `<option value="${r.id}">${roomLabel}</option>`;
            }
        }
    });

    if ([...sel.options].some(o => o.value === prevValue)) sel.value = prevValue;
}

document.getElementById('checkinTime').addEventListener('change', renderRoomOptions);
document.getElementById('checkoutTime').addEventListener('change', renderRoomOptions);

document.getElementById('checkinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const profiles = await sbSelect('profiles', { eq: { username: user.username } });
    const profile = profiles[0];
    const ciTime = document.getElementById('checkinTime').value;
    const coTime = document.getElementById('checkoutTime').value;

    if (!ciTime || !coTime) { showErrorModal('Harap isi jam masuk dan jam keluar!'); return; }

    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const currentMinutes = timeToMinutes(currentTime);
    const ciMinutes = timeToMinutes(ciTime);
    const coMinutes = timeToMinutes(coTime);

    // Validation 1: Check-out must be after check-in
    if (coMinutes <= ciMinutes) {
        showErrorModal(`Jam keluar (${coTime}) harus lebih besar dari jam masuk (${ciTime}).<br><br>Contoh: Masuk 08:00, Keluar 10:00`);
        return;
    }

    // Validation 2: Check-out time cannot be in the past
    if (coMinutes <= currentMinutes) {
        showErrorModal(`Jadwal yang Anda masukkan sudah lewat!<br><br><strong>Jam sekarang:</strong> ${currentTime}<br><strong>Jam masuk:</strong> ${ciTime}<br><strong>Jam keluar:</strong> ${coTime}<br><br>Silakan masukkan jadwal yang belum lewat.`);
        return;
    }

    const dosenDD = document.getElementById('dosenDropdown').value;
    const dosenManual = document.getElementById('dosenName').value.trim();
    const finalDosen = dosenManual || dosenDD;
    if (!finalDosen) { showErrorModal('Harap pilih atau ketik nama dosen!'); return; }

    const roomId = parseInt(document.getElementById('checkinRoom').value);
    const todayStr = new Date().toISOString().split('T')[0];

    // Validation 3: Cek ulang ke database (real-time) apakah jam bentrok dengan booking lain di ruangan yang sama
    const existingRoomCheckins = await sbSelect('checkins', { eq: { room_id: roomId }, neq: { status: 'checkout' } });
    const conflict = existingRoomCheckins.find(c => c.date === todayStr && timesOverlap(ciTime, coTime, c.checkin_time, c.checkout_time));
    if (conflict) {
        showErrorModal(`Ruangan ini sudah dibooking pada jam <strong>${conflict.checkin_time}–${conflict.checkout_time}</strong> dan bentrok dengan jadwal yang Anda masukkan (${ciTime}–${coTime}).<br><br>Silakan pilih jam lain yang tidak bertabrakan, atau pilih ruangan lain.`);
        await loadAvailableRooms();
        return;
    }

    const ci = {
        id: generateId(), room_id: roomId,
        keti_username: user.username, keti_name: profile.name, angkatan: profile.angkatan, kelas: profile.kelas,
        checkin_time: ciTime, checkout_time: coTime, dosen_name: finalDosen,
        mata_kuliah: document.getElementById('mataKuliah').value,
        mode: document.getElementById('classMode').value, status: 'booked',
        date: new Date().toISOString().split('T')[0], timestamp: Date.now()
    };

    const saved = await sbInsert('checkins', ci);
    if (!saved) return;

    // Ask if entering now or just booking
    showConfirm(
        'Apakah Anda dan mahasiswa sudah masuk ke ruangan?',
        async function() {
            // User chose "Yes, sudah masuk" → status = checkedin
            await sbUpdate('checkins', { id: ci.id }, { status: 'checkedin' });
            openSuccessModal(ci);
        },
        {
            title: 'Status Kehadiran',
            icon: 'info',
            iconText: '?',
            yesText: 'Ya, Sudah Masuk',
            noText: 'Booking Dulu',
            yesClass: 'btn-primary',
            onNo: function() {
                // User chose "Booking Dulu" → status stays booked
                openSuccessModal(ci);
            }
        }
    );

    this.reset();
});

async function openSuccessModal(ci) {
    const rooms = await sbSelect('rooms', { eq: { id: ci.room_id } });
    const room = rooms[0];
    document.getElementById('successMessage').innerHTML = `
        <strong>Ruangan:</strong> ${room ? room.name : ''}<br>
        <strong>Jadwal:</strong> ${ci.checkin_time} – ${ci.checkout_time}<br>
        <strong>Dosen:</strong> ${ci.dosen_name}<br>
        <strong>Matkul:</strong> ${ci.mata_kuliah}<br>
        <strong>Mode:</strong> ${ci.mode === 'zoom' ? 'Zoom' : 'Offline'}`;
    document.getElementById('successModal').classList.add('show');
}

function closeModal() { document.getElementById('successModal').classList.remove('show'); }
function showErrorModal(msg) { document.getElementById('errorMessage').innerHTML = msg; document.getElementById('errorModal').classList.add('show'); }
function closeErrorModal() { document.getElementById('errorModal').classList.remove('show'); }

// ============================================
// JADWAL TETAP (AUTO BOOKING MINGGUAN)
// ============================================

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: 'Jumat', sabtu: 'Sabtu', minggu: 'Minggu' };
const HARI_BY_JS_DAY = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']; // Date.getDay(): 0=Minggu..6=Sabtu

function getTodayHari() {
    return HARI_BY_JS_DAY[new Date().getDay()];
}

async function loadJadwalTetapRoomOptions() {
    const rooms = await sbSelect('rooms', { order: { column: 'id' } });
    const sel = document.getElementById('jtRoom');
    sel.innerHTML = '<option value="">-- Pilih Ruangan --</option>';
    rooms.forEach(r => {
        sel.innerHTML += `<option value="${r.id}">${r.name} — Lantai ${r.floor} (${r.type === 'lab' ? 'Lab' : 'Kelas'})</option>`;
    });
}

async function loadJadwalTetapDosenOptions() {
    const dosens = await sbSelect('dosen_users');
    const sel = document.getElementById('jtDosenDropdown');
    sel.innerHTML = '<option value="">-- Pilih dari daftar --</option>';
    dosens.forEach(d => { sel.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
}

document.getElementById('jtDosenDropdown').addEventListener('change', function() {
    if (this.value) document.getElementById('jtDosenName').value = this.value;
});

function showAddJadwalTetap() {
    document.getElementById('addJadwalTetapForm').style.display = 'block';
    loadJadwalTetapRoomOptions();
    loadJadwalTetapDosenOptions();
}

function hideAddJadwalTetap() {
    document.getElementById('addJadwalTetapForm').style.display = 'none';
    document.getElementById('jadwalTetapForm').reset();
}

document.getElementById('jadwalTetapForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const profiles = await sbSelect('profiles', { eq: { username: user.username } });
    const profile = profiles[0];
    if (!profile) { showErrorModal('Lengkapi biodata Anda terlebih dahulu di menu Check-in sebelum membuat jadwal tetap.'); return; }

    const hari = document.getElementById('jtHari').value;
    const roomId = parseInt(document.getElementById('jtRoom').value);
    const ciTime = document.getElementById('jtCheckinTime').value;
    const coTime = document.getElementById('jtCheckoutTime').value;
    const dosenDD = document.getElementById('jtDosenDropdown').value;
    const dosenManual = document.getElementById('jtDosenName').value.trim();
    const finalDosen = dosenManual || dosenDD;
    const mataKuliah = document.getElementById('jtMataKuliah').value.trim();
    const mode = document.getElementById('jtClassMode').value;

    if (!hari || !roomId || !ciTime || !coTime) { showErrorModal('Harap lengkapi semua field wajib!'); return; }

    if (timeToMinutes(coTime) <= timeToMinutes(ciTime)) {
        showErrorModal(`Jam selesai (${coTime}) harus lebih besar dari jam mulai (${ciTime}).<br><br>Contoh: Mulai 08:00, Selesai 10:00`);
        return;
    }
    if (!finalDosen) { showErrorModal('Harap pilih atau ketik nama dosen!'); return; }
    if (!mataKuliah) { showErrorModal('Harap isi mata kuliah!'); return; }

    // Cek bentrok dengan jadwal tetap lain (siapa pun) di ruangan & hari yang sama
    const existing = await sbSelect('jadwal_tetap', { eq: { hari: hari, room_id: roomId } });
    const conflict = existing.find(j => timesOverlap(ciTime, coTime, j.checkin_time, j.checkout_time));
    if (conflict) {
        showErrorModal(`Ruangan ini sudah dipakai untuk jadwal tetap hari <strong>${HARI_LABEL[hari]}</strong> jam <strong>${conflict.checkin_time}–${conflict.checkout_time}</strong> (${escapeHtml(conflict.mata_kuliah)} — ${escapeHtml(conflict.keti_name)}).<br><br>Silakan pilih jam atau ruangan lain.`);
        return;
    }

    const jt = {
        id: generateId(), keti_username: user.username, keti_name: profile.name,
        angkatan: profile.angkatan, kelas: profile.kelas, hari,
        room_id: roomId, checkin_time: ciTime, checkout_time: coTime,
        dosen_name: finalDosen, mata_kuliah: mataKuliah, mode, active: true
    };
    const saved = await sbInsert('jadwal_tetap', jt);
    if (!saved) return;

    showToast('Jadwal tetap berhasil disimpan! Ruangan akan otomatis dibooking setiap ' + HARI_LABEL[hari] + '.', 'success');
    hideAddJadwalTetap();
    await loadJadwalTetap();
});

async function loadJadwalTetap() {
    const user = getCurrentUser();
    const list = await sbSelect('jadwal_tetap', { eq: { keti_username: user.username } });
    const rooms = await sbSelect('rooms');
    const container = document.getElementById('jadwalTetapList');

    let html = '';
    HARI_LIST.forEach(hari => {
        const items = list.filter(j => j.hari === hari).sort((a, b) => timeToMinutes(a.checkin_time) - timeToMinutes(b.checkin_time));
        html += `<div class="panel jt-day-panel"><h4 class="jt-day-title">${HARI_LABEL[hari]}</h4>`;
        if (items.length === 0) {
            html += `<p class="no-data" style="margin:0;">Belum ada jadwal</p>`;
        } else {
            items.forEach(j => {
                const room = rooms.find(r => r.id === j.room_id);
                html += `
                <div class="jt-row">
                    <div>
                        <strong>${escapeHtml(j.mata_kuliah)}</strong>
                        <p class="jt-row-meta">${j.checkin_time}–${j.checkout_time} · ${room ? escapeHtml(room.name) : '-'} · ${escapeHtml(j.dosen_name)} ${j.mode === 'zoom' ? '<span class="zoom-tag">ZOOM</span>' : ''}</p>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="deleteJadwalTetap('${j.id}')">Hapus</button>
                </div>`;
            });
        }
        html += `</div>`;
    });
    container.innerHTML = html;
}

function deleteJadwalTetap(id) {
    showConfirm(
        'Hapus jadwal tetap ini? Ruangan tidak akan lagi dibooking otomatis untuk jadwal ini mulai sekarang.',
        async function() {
            await sbDelete('jadwal_tetap', { id });
            showToast('Jadwal tetap dihapus.', 'success');
            await loadJadwalTetap();
        },
        { title: 'Hapus Jadwal Tetap', yesText: 'Ya, Hapus', yesClass: 'btn-danger' }
    );
}

// Dipanggil saat keti login / dashboard dimuat: otomatis check-in (booking) ruangan
// sesuai jadwal tetap hari ini, kalau belum pernah dibooking otomatis hari ini.
async function autoBookJadwalTetapHariIni() {
    const user = getCurrentUser();
    if (!user || user.role !== 'keti') return;

    const todayHari = getTodayHari();
    const todayDate = new Date().toISOString().split('T')[0];

    const jadwalHariIni = await sbSelect('jadwal_tetap', { eq: { keti_username: user.username, hari: todayHari, active: true } });
    if (jadwalHariIni.length === 0) return;

    const existingCheckins = await sbSelect('checkins', { eq: { keti_username: user.username, date: todayDate } });

    let autoCount = 0, conflictCount = 0;

    for (const j of jadwalHariIni) {
        // Sudah pernah dibooking otomatis untuk jadwal ini hari ini? skip.
        if (existingCheckins.find(c => c.jadwal_tetap_id === j.id)) continue;

        // Cek bentrok dengan checkin lain (siapa pun, ruangan sama) yang sudah ada hari ini
        const roomCheckinsToday = await sbSelect('checkins', { eq: { room_id: j.room_id }, neq: { status: 'checkout' } });
        const conflict = roomCheckinsToday.find(c => c.date === todayDate && timesOverlap(j.checkin_time, j.checkout_time, c.checkin_time, c.checkout_time));
        if (conflict) { conflictCount++; continue; }

        const ci = {
            id: generateId(), room_id: j.room_id,
            keti_username: user.username, keti_name: j.keti_name, angkatan: j.angkatan, kelas: j.kelas,
            checkin_time: j.checkin_time, checkout_time: j.checkout_time, dosen_name: j.dosen_name,
            mata_kuliah: j.mata_kuliah, mode: j.mode, status: 'booked',
            date: todayDate, timestamp: Date.now(), jadwal_tetap_id: j.id, source: 'auto'
        };
        const saved = await sbInsert('checkins', ci);
        if (saved) { autoCount++; existingCheckins.push(saved); }
    }

    if (autoCount > 0) {
        showToast(`${autoCount} ruangan berhasil dibooking otomatis dari jadwal tetap hari ini (${HARI_LABEL[todayHari]}).`, 'success');
        loadRooms();
        if (document.getElementById('checkinView') && document.getElementById('checkinView').classList.contains('active')) loadAvailableRooms();
    }
    if (conflictCount > 0) {
        showToast(`${conflictCount} jadwal tetap gagal dibooking otomatis karena ruangan bentrok jadwal lain. Silakan booking manual.`, 'warning');
    }
}

// ============================================
// AUTO CHECKOUT
// ============================================

async function checkAutoCheckout() {
    // Jika tanggal sudah berganti sejak terakhir dicek, jalankan lagi auto-booking jadwal tetap untuk hari baru
    const todayStr = new Date().toISOString().split('T')[0];
    if (window.__lastCheckedDate && window.__lastCheckedDate !== todayStr) {
        autoBookJadwalTetapHariIni();
    }
    window.__lastCheckedDate = todayStr;

    const checkins = await sbSelect('checkins', { neq: { status: 'checkout' } });
    const now = new Date();
    const ct = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    let upd = false;
    for (const c of checkins) {
        // Booked → Berlangsung: saat jam masuk sudah tiba atau lewat
        if (c.status === 'booked' && c.checkin_time <= ct && c.checkout_time > ct) {
            await sbUpdate('checkins', { id: c.id }, { status: 'checkedin' });
            upd = true;
        }
        // Berlangsung/Booked → Checkout: saat jam keluar sudah lewat
        else if ((c.status === 'checkedin' || c.status === 'booked') && c.checkout_time <= ct) {
            await sbUpdate('checkins', { id: c.id }, { status: 'checkout', actual_checkout: ct, auto_checkout: true });
            upd = true;
        }
    }
    if (upd) {
        if (document.getElementById('cekRuanganView').classList.contains('active')) loadRooms();
        if (document.getElementById('checkoutView').classList.contains('active')) loadCheckout();
    }
}

// ============================================
// CHECKOUT
// ============================================

async function loadCheckout() {
    const user = getCurrentUser();
    const checkins = await sbSelect('checkins', { eq: { keti_username: user.username } });
    const mine = checkins.filter(c => c.status === 'checkedin' || c.status === 'booked');
    const rooms = await sbSelect('rooms');
    const el = document.getElementById('checkoutList');

    if (!mine.length) {
        el.innerHTML = '<div class="empty-box"><h3>Tidak Ada Sesi Aktif</h3><p>Semua sesi sudah di-checkout atau belum ada check-in.</p></div>';
        return;
    }

    let html = '';
    mine.forEach(c => {
        const room = rooms.find(r => r.id === c.room_id);
        const badge = c.status === 'booked'
            ? '<span class="room-tag" style="background:var(--sky-bg);color:var(--sky);">BOOKED</span>'
            : '<span class="room-tag" style="background:var(--amber-bg);color:var(--amber);">BERLANGSUNG</span>';
        html += `
            <div class="co-card">
                <div class="co-card-head"><h4>${room ? room.name : '?'}</h4>${badge}</div>
                <p><strong>Kelas:</strong> ${c.kelas}</p>
                <p><strong>Keti:</strong> ${c.keti_name} (Angkatan ${c.angkatan})</p>
                <p><strong>Dosen:</strong> ${c.dosen_name}</p>
                <p><strong>Matkul:</strong> ${c.mata_kuliah}</p>
                <p><strong>Jadwal:</strong> ${c.checkin_time} – ${c.checkout_time}</p>
                <p><strong>Mode:</strong> ${c.mode === 'zoom' ? 'Zoom' : 'Offline'}</p>
                <button class="btn btn-danger" onclick="doCheckout('${c.id}')">Check-out Sekarang</button>
            </div>`;
    });
    el.innerHTML = html;
}

function doCheckout(id) {
    showConfirm(
        'Apakah Anda yakin ingin melakukan check-out ruangan sekarang?',
        async function() {
            const now = new Date();
            const ct = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            await sbUpdate('checkins', { id }, { status: 'checkout', actual_checkout: ct, auto_checkout: false });
            await loadCheckout();
            showToast('Check-out berhasil! Ruangan sudah tersedia.', 'success');
        },
        {
            title: 'Check-out Ruangan',
            icon: 'warn',
            iconText: '!',
            yesText: 'Ya, Check-out',
            noText: 'Batal',
            yesClass: 'btn-danger'
        }
    );
}

// ============================================
// ABSENSI
// ============================================

let currentCheckinForAbsensi = null;

async function loadAbsensi() {
    const user = getCurrentUser();
    const checkins = await sbSelect('checkins', { eq: { keti_username: user.username, status: 'checkedin' } });
    const ci = checkins[0];
    if (!ci) {
        document.getElementById('absensiNotAvailable').style.display = 'block';
        document.getElementById('absensiContent').style.display = 'none';
        currentCheckinForAbsensi = null;
        return;
    }
    currentCheckinForAbsensi = ci;
    document.getElementById('absensiNotAvailable').style.display = 'none';
    document.getElementById('absensiContent').style.display = 'block';
    const rooms = await sbSelect('rooms', { eq: { id: ci.room_id } });
    const room = rooms[0];
    document.getElementById('absensiRoomInfo').textContent = `${room ? room.name : ''} — ${ci.mata_kuliah} (${ci.kelas})`;
    await loadStudentList();
}

function showAddStudent() { document.getElementById('addStudentForm').style.display = 'block'; }
function hideAddStudent() { document.getElementById('addStudentForm').style.display = 'none'; document.getElementById('studentForm').reset(); }

document.getElementById('studentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentCheckinForAbsensi) return;
    await sbInsert('students', {
        id: generateId(), checkin_id: currentCheckinForAbsensi.id,
        name: document.getElementById('studentName').value,
        npm: document.getElementById('studentNPM').value,
        attendance: null, izin_reason: '', izin_file: ''
    });
    this.reset(); hideAddStudent(); await loadStudentList();
});

async function loadStudentList() {
    if (!currentCheckinForAbsensi) return;
    const students = await sbSelect('students', { eq: { checkin_id: currentCheckinForAbsensi.id } });
    const el = document.getElementById('studentList');
    if (!students.length) { el.innerHTML = '<p class="no-data">Belum ada mahasiswa. Klik "Tambah Mahasiswa".</p>'; return; }

    let html = '';
    students.forEach((s, i) => {
        html += `
            <div class="student-card">
                <div class="st-info">
                    <h4>${i + 1}. ${s.name}</h4>
                    <p>NPM: ${s.npm}</p>
                    ${s.attendance === 'izin' && s.izin_reason ? `<p style="color:var(--amber);"><strong>Alasan:</strong> ${s.izin_reason}</p>` : ''}
                </div>
                <div class="att-opts">
                    <button class="att-btn hadir ${s.attendance === 'hadir' ? 'active' : ''}" onclick="setAtt('${s.id}','hadir')">Hadir</button>
                    <button class="att-btn alfa ${s.attendance === 'alfa' ? 'active' : ''}" onclick="setAtt('${s.id}','alfa')">Alfa</button>
                    <button class="att-btn izin ${s.attendance === 'izin' ? 'active' : ''}" onclick="setAtt('${s.id}','izin')">Izin</button>
                </div>
                <div class="izin-form" style="display:${s.attendance === 'izin' ? 'block' : 'none'}">
                    <textarea placeholder="Alasan izin..." onchange="saveIzin('${s.id}',this.value)">${s.izin_reason || ''}</textarea>
                    <input type="file" accept="image/*,.pdf" onchange="saveIzinFile('${s.id}',this)">
                    ${s.izin_file ? `<div style="margin-top:6px;"><p style="font-size:0.75rem;color:var(--green);margin-bottom:4px;">📎 ${s.izin_file}</p>${s.izin_file_data ? (s.izin_file_data.startsWith('data:image') ? `<img src="${s.izin_file_data}" style="max-width:150px;max-height:100px;border-radius:4px;border:1px solid var(--border);cursor:pointer;" onclick="window.open(this.src,'_blank')" title="Klik untuk buka ukuran penuh">` : `<a href="${s.izin_file_data}" download="${s.izin_file}" class="btn btn-outline" style="font-size:0.75rem;padding:4px 10px;">Download File</a>`) : ''}</div>` : ''}
                </div>
            </div>`;
    });
    el.innerHTML = html;
}

async function setAtt(id, status) {
    await sbUpdate('students', { id }, { attendance: status });
    await loadStudentList();
}

async function saveIzin(id, reason) {
    await sbUpdate('students', { id }, { izin_reason: reason });
}

function saveIzinFile(id, input) {
    if (input.files.length > 0) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            await sbUpdate('students', { id }, { izin_file: file.name, izin_file_data: e.target.result }); // base64 data URL
            await loadStudentList();
        };
        reader.readAsDataURL(file);
    }
}

async function exportToExcel() {
    if (!currentCheckinForAbsensi) { showToast('Tidak ada data absensi untuk diekspor.', 'warning'); return; }
    const students = await sbSelect('students', { eq: { checkin_id: currentCheckinForAbsensi.id } });
    const rooms = await sbSelect('rooms', { eq: { id: currentCheckinForAbsensi.room_id } });
    const room = rooms[0];
    if (!students.length) { showToast('Belum ada data mahasiswa.', 'warning'); return; }

    // Create HTML table with colored cells (Excel compatible)
    let html = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1B2A4A" ss:Pattern="Solid"/></Style>
  <Style ss:ID="subheader"><Font ss:Bold="1"/></Style>
  <Style ss:ID="hadir"><Interior ss:Color="#2E7D4F" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
  <Style ss:ID="alfa"><Interior ss:Color="#B03A2E" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
  <Style ss:ID="izin"><Interior ss:Color="#B8860B" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
 </Styles>
 <Worksheet ss:Name="Absensi">
  <Table>
   <Row><Cell ss:StyleID="header" ss:MergeAcross="4"><Data ss:Type="String">Absensi - ${room ? room.name : ''} - ${currentCheckinForAbsensi.mata_kuliah} (${currentCheckinForAbsensi.kelas})</Data></Cell></Row>
   <Row><Cell ss:StyleID="subheader" ss:MergeAcross="4"><Data ss:Type="String">Dosen: ${currentCheckinForAbsensi.dosen_name} | Tanggal: ${currentCheckinForAbsensi.date}</Data></Cell></Row>
   <Row>
    <Cell ss:StyleID="subheader"><Data ss:Type="String">No</Data></Cell>
    <Cell ss:StyleID="subheader"><Data ss:Type="String">Nama</Data></Cell>
    <Cell ss:StyleID="subheader"><Data ss:Type="String">NPM</Data></Cell>
    <Cell ss:StyleID="subheader"><Data ss:Type="String">Kehadiran</Data></Cell>
    <Cell ss:StyleID="subheader"><Data ss:Type="String">Alasan Izin</Data></Cell>
   </Row>`;

    students.forEach((s, i) => {
        const att = s.attendance ? s.attendance.charAt(0).toUpperCase() + s.attendance.slice(1) : 'Belum';
        const reason = s.izin_reason || '-';

        // Style based on attendance
        let style = '';
        if (s.attendance === 'hadir') style = 'hadir';
        else if (s.attendance === 'alfa') style = 'alfa';
        else if (s.attendance === 'izin') style = 'izin';

        html += `   <Row>
    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${s.name}</Data></Cell>
    <Cell><Data ss:Type="String">${s.npm}</Data></Cell>
    <Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${att}</Data></Cell>
    <Cell><Data ss:Type="String">${reason}</Data></Cell>
   </Row>`;
    });

    html += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Absensi_${room ? room.name : ''}_${currentCheckinForAbsensi.kelas}_${currentCheckinForAbsensi.date}.xls`;
    a.click();

    // Download bukti izin files separately
    const studentsWithFiles = students.filter(s => s.izin_file_data && s.izin_file);
    if (studentsWithFiles.length > 0) {
        showConfirm(
            `Ditemukan <strong>${studentsWithFiles.length} file bukti izin</strong> yang telah diupload. Apakah Anda ingin mendownload file-file tersebut?`,
            function() {
                studentsWithFiles.forEach((s, idx) => {
                    setTimeout(() => {
                        const byteString = atob(s.izin_file_data.split(',')[1]);
                        const mimeString = s.izin_file_data.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const blob = new Blob([ab], { type: mimeString });
                        const url = URL.createObjectURL(blob);

                        const link = document.createElement('a');
                        link.href = url;
                        const cleanName = s.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
                        const ext = s.izin_file.split('.').pop();
                        link.download = `Bukti_Izin_${cleanName}_${s.npm}.${ext}`;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();

                        setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }, 100);
                    }, idx * 800);
                });
                showToast('File bukti izin sedang didownload...', 'info');
            },
            {
                title: 'Download Bukti Izin',
                icon: 'info',
                iconText: '↓',
                yesText: 'Ya, Download',
                noText: 'Lewati',
                yesClass: 'btn-primary'
            }
        );
    }
}

// ============================================
// CHAT (KETI)
// ============================================

let currentChatTarget = null;

async function loadChat() {
    const user = getCurrentUser();
    const el = document.getElementById('userList');
    let html = '';

    const ketis = await sbSelect('keti_users');
    const dosens = await sbSelect('dosen_users');

    ketis.forEach(k => {
        if (k.username !== user.username) {
            html += `<div class="chat-contact" onclick="openChat('keti','${k.username}','${k.name}')"><div class="chat-contact-av" style="background:var(--navy);">${k.name.charAt(0)}</div><div><h5>${k.name}</h5><p>Keti</p></div></div>`;
        }
    });
    dosens.forEach(d => {
        html += `<div class="chat-contact" onclick="openChat('dosen','${d.username}','${d.name}')"><div class="chat-contact-av" style="background:var(--teal);">${d.name.charAt(0)}</div><div><h5>${d.name}</h5><p>Dosen</p></div></div>`;
    });
    el.innerHTML = html || '<p class="no-data">Belum ada user lain</p>';
}

document.getElementById('chatSearchInput').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#userList .chat-contact').forEach(item => {
        item.style.display = item.querySelector('h5').textContent.toLowerCase().includes(q) ? 'flex' : 'none';
    });
});

function openChat(role, username, name) {
    currentChatTarget = { role, username, name };
    document.getElementById('chatPlaceholder').style.display = 'none';
    const aa = document.getElementById('chatActiveArea');
    aa.style.display = 'flex'; aa.style.flexDirection = 'column'; aa.style.flex = '1';
    document.getElementById('chatHeader').textContent = name;
    document.querySelectorAll('#userList .chat-contact').forEach(i => {
        i.classList.toggle('active', i.querySelector('h5').textContent === name);
    });
    loadMessages();
    document.getElementById('messageInput').focus();
}

async function loadMessages() {
    if (!currentChatTarget) return;
    const user = getCurrentUser();
    const msgs = await getMessagesBetween(user.username, currentChatTarget.username);
    const el = document.getElementById('chatMessages');
    if (!msgs.length) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.82rem;">Belum ada pesan.</p>'; return; }
    el.innerHTML = msgs.map(m => `<div class="msg ${m.from_user === user.username ? 'sent' : 'received'}"><div class="msg-content"><div class="bubble">${escapeHtml(m.text)}</div><span class="msg-time">${m.time}</span></div></div>`).join('');
    el.scrollTop = el.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    const user = getCurrentUser();
    const now = new Date();
    await sbInsert('messages', {
        id: generateId(), from_user: user.username, from_role: user.role, from_name: user.name,
        to_user: currentChatTarget.username, to_role: currentChatTarget.role,
        text, time: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
        timestamp: Date.now()
    });
    input.value = ''; await loadMessages();
}

document.getElementById('messageInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });

// ============================================
// DOSEN DASHBOARD
// ============================================

function loadDosenDashboard() { loadKelasDosen(); }

async function loadKelasDosen() {
    const user = getCurrentUser();
    const checkins = await sbSelect('checkins', { neq: { status: 'checkout' } });
    const rooms = await sbSelect('rooms');
    const mine = checkins.filter(c => c.dosen_name && c.dosen_name.toLowerCase().includes(user.name.toLowerCase()));
    const el = document.getElementById('kelasList');

    if (!mine.length) {
        el.innerHTML = '<div class="empty-box"><h3>Belum Ada Kelas</h3><p>Belum ada kelas yang terdaftar untuk Anda.</p></div>';
        return;
    }

    el.innerHTML = mine.map(c => {
        const room = rooms.find(r => r.id === c.room_id);
        const badge = c.status === 'booked'
            ? '<span class="room-tag" style="background:var(--sky-bg);color:var(--sky);">BOOKED</span>'
            : '<span class="room-tag" style="background:var(--amber-bg);color:var(--amber);">BERLANGSUNG</span>';
        return `<div class="co-card"><div class="co-card-head"><h4>${room ? room.name : '?'}</h4>${badge}</div>
            <p><strong>Matkul:</strong> ${c.mata_kuliah}</p><p><strong>Kelas:</strong> ${c.kelas}</p>
            <p><strong>Keti:</strong> ${c.keti_name}</p><p><strong>Jadwal:</strong> ${c.checkin_time} – ${c.checkout_time}</p>
            <p><strong>Mode:</strong> ${c.mode === 'zoom' ? 'Zoom' : 'Offline'}</p>
            <button class="btn btn-primary" style="width:auto;margin-top:10px;" onclick="openChatFromDosen('${c.keti_username}','${c.keti_name}')">Chat Keti</button></div>`;
    }).join('');
}

document.getElementById('searchKelas').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#kelasList .co-card').forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
});

function openChatFromDosen(username, name) {
    document.querySelectorAll('#dosenDashboard .sb-link').forEach(b => b.classList.remove('active'));
    document.querySelector('#dosenDashboard [data-view="chatDosen"]').classList.add('active');
    document.querySelectorAll('#dosenDashboard .view').forEach(v => v.classList.remove('active'));
    document.getElementById('chatDosenView').classList.add('active');
    const t = document.getElementById('dosenPageTitle');
    if (t) t.textContent = 'Chat Keti';
    loadChatDosen();
    setTimeout(() => openChatDosen(username, name), 200);
}

let currentChatTargetDosen = null;

async function loadChatDosen() {
    const ketis = await sbSelect('keti_users');
    const el = document.getElementById('ketiList');
    el.innerHTML = ketis.map(k =>
        `<div class="chat-contact" onclick="openChatDosen('${k.username}','${k.name}')"><div class="chat-contact-av" style="background:var(--navy);">${k.name.charAt(0)}</div><div><h5>${k.name}</h5><p>Keti</p></div></div>`
    ).join('') || '<p class="no-data">Belum ada keti</p>';
}

function openChatDosen(username, name) {
    currentChatTargetDosen = { username, name };
    document.getElementById('chatPlaceholderDosen').style.display = 'none';
    const aa = document.getElementById('chatActiveAreaDosen');
    aa.style.display = 'flex'; aa.style.flexDirection = 'column'; aa.style.flex = '1';
    document.getElementById('chatHeaderDosen').textContent = name;
    document.querySelectorAll('#ketiList .chat-contact').forEach(i => {
        i.classList.toggle('active', i.querySelector('h5').textContent === name);
    });
    loadMessagesDosen();
    document.getElementById('messageInputDosen').focus();
}

async function loadMessagesDosen() {
    if (!currentChatTargetDosen) return;
    const user = getCurrentUser();
    const msgs = await getMessagesBetween(user.username, currentChatTargetDosen.username);
    const el = document.getElementById('chatMessagesDosen');
    if (!msgs.length) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.82rem;">Belum ada pesan.</p>'; return; }
    el.innerHTML = msgs.map(m => `<div class="msg ${m.from_user === user.username ? 'sent' : 'received'}"><div class="msg-content"><div class="bubble">${escapeHtml(m.text)}</div><span class="msg-time">${m.time}</span></div></div>`).join('');
    el.scrollTop = el.scrollHeight;
}

async function sendMessageDosen() {
    const input = document.getElementById('messageInputDosen');
    const text = input.value.trim();
    if (!text || !currentChatTargetDosen) return;
    const user = getCurrentUser();
    const now = new Date();
    await sbInsert('messages', {
        id: generateId(), from_user: user.username, from_role: user.role, from_name: user.name,
        to_user: currentChatTargetDosen.username, to_role: 'keti',
        text, time: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
        timestamp: Date.now()
    });
    input.value = ''; await loadMessagesDosen();
}

document.getElementById('messageInputDosen').addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessageDosen(); });

// ============================================
// ADMIN
// ============================================

function loadAdminPanel() { loadKetiTable(); loadDosenTable(); loadRoomTable(); }

function showAddKeti() { document.getElementById('addKetiForm').style.display = 'block'; }
function hideAddKeti() { document.getElementById('addKetiForm').style.display = 'none'; document.getElementById('ketiForm').reset(); }

document.getElementById('ketiForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const un = document.getElementById('newKetiUsername').value;
    const existing = await sbSelect('keti_users', { eq: { username: un } });
    if (existing.length) { showToast('Username sudah digunakan!', 'error'); return; }
    await sbInsert('keti_users', { username: un, password: document.getElementById('newKetiPassword').value, name: document.getElementById('newKetiName').value });
    hideAddKeti(); await loadKetiTable();
    showToast('Keti berhasil ditambahkan!', 'success');
});

async function loadKetiTable() {
    const users = await sbSelect('keti_users');
    const el = document.getElementById('ketiTable');
    if (!users.length) { el.innerHTML = '<p class="no-data">Belum ada keti</p>'; return; }
    el.innerHTML = `<div class="data-table"><table><thead><tr><th>No</th><th>Username</th><th>Nama</th><th>Aksi</th></tr></thead><tbody>${
        users.map((k, i) => `<tr><td>${i + 1}</td><td>${k.username}</td><td>${k.name}</td><td><button class="btn btn-danger" onclick="deleteKeti('${k.username}')">Hapus</button></td></tr>`).join('')
    }</tbody></table></div>`;
}

function deleteKeti(u) {
    showConfirm(
        'Apakah Anda yakin ingin menghapus keti ini? Tindakan ini tidak dapat dibatalkan.',
        async function() {
            await sbDelete('keti_users', { username: u });
            await loadKetiTable();
            showToast('Keti berhasil dihapus.', 'success');
        },
        { title: 'Hapus Keti', icon: 'danger', iconText: '✕', yesText: 'Ya, Hapus', noText: 'Batal', yesClass: 'btn-danger' }
    );
}

function showAddDosen() { document.getElementById('addDosenForm').style.display = 'block'; }
function hideAddDosen() { document.getElementById('addDosenForm').style.display = 'none'; document.getElementById('dosenForm').reset(); }

document.getElementById('dosenForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const un = document.getElementById('newDosenUsername').value;
    const existing = await sbSelect('dosen_users', { eq: { username: un } });
    if (existing.length) { showToast('Username sudah digunakan!', 'error'); return; }
    await sbInsert('dosen_users', { username: un, password: document.getElementById('newDosenPassword').value, name: document.getElementById('newDosenName').value });
    hideAddDosen(); await loadDosenTable();
    showToast('Dosen berhasil ditambahkan!', 'success');
});

async function loadDosenTable() {
    const users = await sbSelect('dosen_users');
    const el = document.getElementById('dosenTable');
    if (!users.length) { el.innerHTML = '<p class="no-data">Belum ada dosen</p>'; return; }
    el.innerHTML = `<div class="data-table"><table><thead><tr><th>No</th><th>Username</th><th>Nama</th><th>Aksi</th></tr></thead><tbody>${
        users.map((d, i) => `<tr><td>${i + 1}</td><td>${d.username}</td><td>${d.name}</td><td><button class="btn btn-danger" onclick="deleteDosen('${d.username}')">Hapus</button></td></tr>`).join('')
    }</tbody></table></div>`;
}

function deleteDosen(u) {
    showConfirm(
        'Apakah Anda yakin ingin menghapus dosen ini? Tindakan ini tidak dapat dibatalkan.',
        async function() {
            await sbDelete('dosen_users', { username: u });
            await loadDosenTable();
            showToast('Dosen berhasil dihapus.', 'success');
        },
        { title: 'Hapus Dosen', icon: 'danger', iconText: '✕', yesText: 'Ya, Hapus', noText: 'Batal', yesClass: 'btn-danger' }
    );
}

function showAddRoom() { document.getElementById('addRoomForm').style.display = 'block'; }
function hideAddRoom() { document.getElementById('addRoomForm').style.display = 'none'; document.getElementById('roomForm').reset(); }

document.getElementById('roomForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await sbInsert('rooms', {
        name: document.getElementById('newRoomName').value,
        floor: parseInt(document.getElementById('newRoomFloor').value),
        type: document.getElementById('newRoomType').value
    });
    hideAddRoom(); await loadRoomTable();
});

async function loadRoomTable() {
    const rooms = await sbSelect('rooms', { order: { column: 'id' } });
    const el = document.getElementById('roomTable');
    if (!rooms.length) { el.innerHTML = '<p class="no-data">Belum ada ruangan</p>'; return; }
    el.innerHTML = `<div class="data-table"><table><thead><tr><th>No</th><th>Nama</th><th>Lantai</th><th>Tipe</th><th>Aksi</th></tr></thead><tbody>${
        rooms.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td>Lantai ${r.floor}</td><td>${r.type === 'lab' ? 'Lab' : 'Kelas'}</td><td><button class="btn btn-danger" onclick="deleteRoom(${r.id})">Hapus</button></td></tr>`).join('')
    }</tbody></table></div>`;
}

function deleteRoom(id) {
    showConfirm(
        'Apakah Anda yakin ingin menghapus ruangan ini? Tindakan ini tidak dapat dibatalkan.',
        async function() {
            await sbDelete('rooms', { id });
            await loadRoomTable();
            showToast('Ruangan berhasil dihapus.', 'success');
        },
        { title: 'Hapus Ruangan', icon: 'danger', iconText: '✕', yesText: 'Ya, Hapus', noText: 'Batal', yesClass: 'btn-danger' }
    );
}

// ============================================
// INIT
// ============================================

const saved = getCurrentUser();
if (saved) {
    if (saved.role === 'keti') {
        document.getElementById('ketiName').textContent = saved.name;
        document.getElementById('ketiAvatar').textContent = saved.name.charAt(0).toUpperCase();
        showPage('ketiDashboard'); loadKetiDashboard();
    } else if (saved.role === 'dosen') {
        document.getElementById('dosenDisplayName').textContent = saved.name;
        document.getElementById('dosenAvatar').textContent = saved.name.charAt(0).toUpperCase();
        showPage('dosenDashboard'); loadDosenDashboard();
    } else if (saved.role === 'admin') {
        showPage('adminDashboard'); loadAdminPanel();
    }
}

setInterval(() => {
    if (currentChatTarget && document.getElementById('chatView').classList.contains('active')) loadMessages();
    if (currentChatTargetDosen && document.getElementById('chatDosenView').classList.contains('active')) loadMessagesDosen();
}, 3000);
