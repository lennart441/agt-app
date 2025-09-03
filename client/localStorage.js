// AGT-Trupp Local Storage Interface
// Speichert, lädt und verwaltet Truppdaten im Local Storage

const LOCAL_STORAGE_KEY = 'agt_trupps_v2';

window.getAllTrupps = function() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trupps));
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
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trupps));
        return trupps[idx];
    }
    return null;
}

window.deleteTrupp = function(id) {
    let trupps = window.getAllTrupps();
    trupps = trupps.filter(t => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trupps));
}

window.addMeldungToTrupp = function(id, meldung) {
    const trupp = window.getTrupp(id);
    if (trupp) {
        trupp.meldungen = trupp.meldungen || [];
        trupp.meldungen.push(meldung);
        window.saveTrupp(trupp);
    }
}

window.addMemberToTrupp = function(id, member) {
    const trupp = window.getTrupp(id);
    if (trupp) {
        trupp.members = trupp.members || [];
        trupp.members.push(member);
        window.saveTrupp(trupp);
    }
}
