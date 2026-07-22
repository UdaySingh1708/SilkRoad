"use strict";

/*
==========================================
Silk Road Smart Match Maker
==========================================
*/

const waitingQueue = [];
const partners = new Map();
const blockedUsers = new Map();

/*
==========================================
Blocked Users
==========================================
*/

function isBlocked(a, b) {

    const listA = blockedUsers.get(a);
    if (listA && listA.has(b)) return true;

    const listB = blockedUsers.get(b);
    if (listB && listB.has(a)) return true;

    return false;

}

/*
==========================================
Preference Score
==========================================
*/

function getScore(userA, userB) {

    let score = 0;

    if (!userA || !userB) return 0;

    if (
        userA.preferences.language === userB.preferences.language ||
        userA.preferences.language === "Any" ||
        userB.preferences.language === "Any"
    ) {
        score += 3;
    }

    if (
        userA.preferences.mode === userB.preferences.mode ||
        userA.preferences.mode === "Any" ||
        userB.preferences.mode === "Any"
    ) {
        score += 2;
    }

    if (
        userA.preferences.interest === userB.preferences.interest ||
        userA.preferences.interest === "Any" ||
        userB.preferences.interest === "Any"
    ) {
        score += 2;
    }

    return score;

}

/*
==========================================
Exports
==========================================
*/

function getPartnersMap() {
    return partners;
}

module.exports = {
    
getPartnersMap,

    find(id, sockets) {

        let best = null;
        let bestScore = -1;

        const me = sockets.get(id);

        for (let i = waitingQueue.length - 1; i >= 0; i--) {

            const stranger = waitingQueue[i];

            if (!sockets.has(stranger)) {

                waitingQueue.splice(i, 1);
                continue;

            }

            if (stranger === id) continue;

            if (partners.has(stranger)) continue;

            if (isBlocked(id, stranger)) continue;

            const other = sockets.get(stranger);

            const score = getScore(me, other);

            if (score > bestScore) {

                bestScore = score;
                best = stranger;

            }

        }

        if (!best && waitingQueue.length > 0) {

            for (let i = waitingQueue.length - 1; i >= 0; i--) {

                const stranger = waitingQueue[i];

                if (stranger === id) continue;

                if (!sockets.has(stranger)) {

                    waitingQueue.splice(i, 1);
                    continue;

                }

                if (partners.has(stranger)) continue;

                if (isBlocked(id, stranger)) continue;

                best = stranger;
                break;

            }

        }

        if (best) {

            const index = waitingQueue.indexOf(best);

            if (index !== -1) {

                waitingQueue.splice(index, 1);

            }

        }

        return best;

    },

    wait(id) {

        if (partners.has(id)) return;

        const index = waitingQueue.indexOf(id);

        if (index !== -1) {

            waitingQueue.splice(index, 1);

        }

        waitingQueue.push(id);

    },

    remove(id) {

        const partner = partners.get(id);

        partners.delete(id);

        if (partner) {

            partners.delete(partner);

        }

        const index = waitingQueue.indexOf(id);

        if (index !== -1) {

            waitingQueue.splice(index, 1);

        }

        return partner;

    },

    setPartner(a, b) {

        partners.set(a, b);
        partners.set(b, a);

    },

    getPartner(id) {

        return partners.get(id);

    },

    block(a, b) {

        if (!blockedUsers.has(a)) {

            blockedUsers.set(a, new Set());

        }

        blockedUsers.get(a).add(b);

    }

};