const bcrypt = require("bcrypt")
const User = require("../models/User");
const Otp = require("../models/Otp");
const jwt = require("jsonwebtoken")
const otpGenerator = require("otp-generator")
require("dotenv").config()

exports.signup = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, otp } = req.body;

        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).send({
                success: false,
                message: "All Fields are required"
            })
        }

        if (password !== confirmPassword) {
            return res.status(403).send({
                success: false,
                message: "Password and confirm password are not same",
            })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(403).send({
                success: false,
                message: "User already registered. Please login",
            })
        }

        const response = await Otp.find({ email }).sort({ createdAt: -1 }).limit(1)
        console.log(response)

        if (response.length === 0) {
            return res.status(400).json({
                success: false,
                message: "The OTP is not valid",
            })
        } else if (otp !== response[0].otp) {
            return res.status(400).json({
                success: false,
                message: "The OTP is not valid",
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        })

        return res.status(200).json({
            success: true,
            user,
            message: "User registered successfully",
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: "User cannot be registered. Please try again"
        })
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(403).json({
                success: false,
                message: "All fields are required",
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "User is not registered with us Please Signup to Continue",
            })
        }

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({
                email: user.email, id: user._id
            },
                process.env.JWT_SECRET,
                { expiresIn: "24h" })

            user.token = token
            user.password = undefined
            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true,
            }
            res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: "User Login Successfully"
            })
        } else {
            return res.status(401).json({
                success: false,
                message: "Passwod is incorrect",
            })
        }

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: "Login failed Please try again"
        })
    }
}

exports.sendotp = async (req, res) => {
    try {
        const { email } = req.body;

        const checkUserPresent = await User.findOne({ email });
        if (checkUserPresent) {
            return res.status(403).json({
                success: false,
                message: "User already registered",
            })
        }

        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        })

        const result = await Otp.findOne({ otp: otp })

        console.log("Result is Generate OTP Func")
        console.log("OTP", otp)
        console.log("Result", result)

        while (result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            })
        }

        const otpPayload = { email, otp }
        const otpBody = await Otp.create(otpPayload)
        console.log("OTP Body", otpBody)

        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            otp,
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

