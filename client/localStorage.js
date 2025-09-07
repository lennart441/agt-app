// AGT-Trupp Local Storage Interface
// Speichert, lädt und verwaltet Truppdaten im Local Storage

const TRUPPS_KEY = 'agt_trupps_v2';

// Helper-Funktionen für localStorage
window.saveTruppsToLocalStorage = function(trupps) {
    localStorage.setItem(TRUPPS_KEY, JSON.stringify(trupps));
};

window.loadTruppsFromLocalStorage = function() {
    const data = localStorage.getItem(TRUPPS_KEY);
    return data ? JSON.parse(data) : [];
};

window.getAllTrupps = function() {
    const raw = localStorage.getItem(TRUPPS_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('Fehler beim Laden der Truppdaten aus Local Storage:', e);
        return [];
    }
}

window.saveTrupp = function(trupp) {
    const trupps = window.getAllTrupps();
    const idx = trupps.findIndex(t => t.id === trupp.id);
    if (idx >= 0) {
        trupps[idx] = trupp;
    } else {
        trupps.push(trupp);
    }
    localStorage.setItem(TRUPPS_KEY, JSON.stringify(trupps));
    if (typeof renderAllTrupps === 'function') renderAllTrupps();
}

window.getTrupp = function(id) {
    const trupps = window.getAllTrupps();
    return trupps.find(t => t.id === id) || null;
}

window.updateTrupp = function(id, changes) {
    const trupps = window.getAllTrupps();
    const idx = trupps.findIndex(t => t.id === id);
    if (idx >= 0) {
        trupps[idx] = { ...trupps[idx], ...changes };
        localStorage.setItem(TRUPPS_KEY, JSON.stringify(trupps));
        if (typeof renderAllTrupps === 'function') renderAllTrupps();
        return trupps[idx];
    }
    return null;
}

window.deleteTrupp = function(id) {
    let trupps = window.getAllTrupps();
    trupps = trupps.filter(t => t.id !== id);
    localStorage.setItem(TRUPPS_KEY, JSON.stringify(trupps));
    if (typeof renderAllTrupps === 'function') renderAllTrupps();
}

window.addMeldungToTrupp = function(id, meldung) {
    const trupp = window.getTrupp(id);
    if (trupp) {
        trupp.meldungen = trupp.meldungen || [];
        trupp.meldungen.push(meldung);
        window.saveTrupp(trupp);
        if (typeof renderAllTrupps === 'function') renderAllTrupps();
    }
}

window.addMemberToTrupp = function(id, member) {
    const trupp = window.getTrupp(id);
    if (trupp) {
        trupp.members = trupp.members || [];
        trupp.members.push(member);
        window.saveTrupp(trupp);
        if (typeof renderAllTrupps === 'function') renderAllTrupps();
    }
}
