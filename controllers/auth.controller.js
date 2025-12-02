const User = require("../models/users.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASS || "your-app-password"
  }
});

// Send verification email
async function sendVerificationEmail(email, token, name) {
  try {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    await transporter.sendMail({
      from: process.env.SMTP_USER || '"ScentryX" <noreply@scentryx.com>',
      to: email,
      subject: 'Verify Your Email - ScentryX',
      html: `
        <h2>Welcome to ScentryX, ${name}!</h2>
        <p>Please verify your email by clicking this link:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link expires in 24 hours.</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// REGISTER with email verification
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Generate verification token using built-in crypto
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Hash password and create user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      phone: phone || "",
      isVerified: false,
      verificationToken,
      verificationExpires,
      alertPreferences: {
        emailAlerts: true,
        smsAlerts: false,
        pushAlerts: true
      }
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, name);

    // Create JWT (limited access until verified)
    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      isVerified: false 
    }, process.env.JWT_SECRET || "secret123", { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: emailSent 
        ? "User created. Please check your email to verify." 
        : "User created, but verification email failed.",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LOGIN with verification check
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: "Wrong password" 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        data: {
          requiresVerification: true,
          email: user.email
        }
      });
    }

    // Create JWT
    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      isVerified: true 
    }, process.env.JWT_SECRET || "secret123", { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: true,
          alertPreferences: user.alertPreferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// VERIFY EMAIL
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Create full access token
    const fullToken = jwt.sign({ 
      id: user._id,
      email: user.email,
      isVerified: true 
    }, process.env.JWT_SECRET || "secret123", { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Email verified successfully!",
      data: {
        token: fullToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: true
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// RESEND VERIFICATION
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // Generate new token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Send email
    const emailSent = await sendVerificationEmail(email, verificationToken, user.name);

    res.json({
      success: true,
      message: emailSent 
        ? "Verification email sent" 
        : "Failed to send email"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// UPDATE ALERT PREFERENCES
exports.updateAlertPreferences = async (req, res) => {
  try {
    const userId = req.user?.id; // Will come from auth middleware
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { emailAlerts, smsAlerts, pushAlerts, phoneNumbers } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update preferences
    user.alertPreferences = {
      emailAlerts: emailAlerts !== undefined ? emailAlerts : (user.alertPreferences?.emailAlerts || true),
      smsAlerts: smsAlerts !== undefined ? smsAlerts : (user.alertPreferences?.smsAlerts || false),
      pushAlerts: pushAlerts !== undefined ? pushAlerts : (user.alertPreferences?.pushAlerts || true)
    };
    
    if (phoneNumbers !== undefined) {
      user.phoneNumbers = phoneNumbers;
    }

    await user.save();

    res.json({
      success: true,
      message: "Preferences updated",
      data: {
        alertPreferences: user.alertPreferences,
        phoneNumbers: user.phoneNumbers || []
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET USER PROFILE
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(userId).select('-password -verificationToken -verificationExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};