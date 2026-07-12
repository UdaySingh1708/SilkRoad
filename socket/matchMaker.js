"use strict";

/*
==========================================
Silk Road Match Maker
Professional Version
==========================================
*/

const waitingQueue = [];

const partners = new Map();

const blockedUsers = new Map();

/*
------------------------------------------
Block System
------------------------------------------
*/

function isBlocked(userA, userB) {

    const listA = blockedUsers.get(userA);

    if (listA && listA.has(userB)) {
        return true;
    }

    const listB = blockedUsers.get(userB);

    if (listB && listB.has(userA)) {
        return true;
    }

    return false;

}

/*
------------------------------------------
Exports
------------------------------------------
*/

module.exports = {

    find(id) {

        for (let i = 0; i < waitingQueue.length; i++) {

            const stranger = waitingQueue[i];

            if (stranger === id) {
                continue;
            }

            if (isBlocked(id, stranger)) {
                continue;
            }

            waitingQueue.splice(i, 1);

            return stranger;

        }

        return null;

    },

    wait(id) {

        if (!waitingQueue.includes(id)) {

            waitingQueue.push(id);

        }

    },

    setPartner(user1, user2) {

        partners.set(user1, user2);

        partners.set(user2, user1);

    },

    getPartner(id) {

        return partners.get(id);

    },

    block(user1, user2) {

        if (!blockedUsers.has(user1)) {

            blockedUsers.set(user1, new Set());

        }

        blockedUsers.get(user1).add(user2);

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

    }

};