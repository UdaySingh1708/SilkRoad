"use strict";

let waitingUser = null;

const partners = new Map();


module.exports = {

    find(id) {

        if (waitingUser && waitingUser !== id) {

            const partner = waitingUser;

            waitingUser = null;

            return partner;

        }

        return null;
    },


    wait(id) {

        waitingUser = id;

    },


    setPartner(user1, user2) {

        partners.set(user1, user2);

        partners.set(user2, user1);

    },


    getPartner(id) {

        return partners.get(id);

    },


    remove(id) {

        const partner = partners.get(id);


        partners.delete(id);


        if (partner) {

            partners.delete(partner);

        }


        if (waitingUser === id) {

            waitingUser = null;

        }


        return partner;

    }

};