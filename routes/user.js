const express = require("express");
const router = express.Router()

const { login, signup, sendotp } = require("../controllers/user")

router.post("/login", login)

router.post("/signup", signup)

router.post("/sendotp", sendotp)

module.exports = router