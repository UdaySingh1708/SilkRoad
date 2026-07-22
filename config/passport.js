"use strict";

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

module.exports = function (passport) {

    console.log("CLIENT_ID:", JSON.stringify(process.env.GOOGLE_CLIENT_ID));
    console.log("CLIENT_SECRET exists:", !!process.env.GOOGLE_CLIENT_SECRET);
    console.log("CALLBACK_URL:", JSON.stringify(process.env.GOOGLE_CALLBACK_URL));

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID.trim(),
clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
callbackURL: process.env.GOOGLE_CALLBACK_URL.trim(),
            },

            async function (accessToken, refreshToken, profile, done) {

                try {

                    const googleUserId = "google_" + profile.id;

let user = await User.findOne({
    $or: [
        { googleId: profile.id },
        { userId: googleUserId }
    ]
});

if (!user) {

    user = await User.create({

        userId: googleUserId,

        googleId: profile.id,

        email: profile.emails?.[0]?.value || "",

        displayName: profile.displayName,

        avatar: profile.photos?.[0]?.value || "",

        accountType: "google",

        isProfileComplete: false

    });

} else {

    user.googleId = profile.id;

    user.userId = googleUserId;

    user.email = profile.emails?.[0]?.value || user.email;

    user.displayName = profile.displayName;

    user.avatar = profile.photos?.[0]?.value || user.avatar;

    user.accountType = "google";

    await user.save();

}

return done(null, user);
console.log("Passport user before done:", {
    userId: user.userId,
    accountType: user.accountType
});

                } catch (error) {

                    return done(error, null);

                }

            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {

        try {

            const user = await User.findById(id);
            done(null, user);

        } catch (error) {

            done(error, null);

        }

    });

};