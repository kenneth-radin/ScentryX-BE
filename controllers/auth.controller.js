const User = require("../models/users.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER with verification token (NO EMAIL)
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

    // Generate verification token
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
        emailAlerts: false,  // No email alerts
        smsAlerts: false,
        pushAlerts: true
      }
    });

    // Create JWT (limited access until verified)
    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      isVerified: false 
    }, process.env.JWT_SECRET || "secret123", { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: "User created. Please verify your account in the app.",
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
        },
        // Return verification token so app can verify later
        verificationInfo: {
          requiresVerification: true,
          verificationToken: verificationToken,
          verifyEndpoint: `/api/auth/verify-email/${verificationToken}`
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
        message: "Account not verified. Please verify your account first.",
        data: {
          requiresVerification: true,
          userId: user._id,
          email: user.email,
          canResend: true
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

// VERIFY ACCOUNT (no email needed)
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
      message: "Account verified successfully!",
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

// RESEND VERIFICATION (returns token directly)
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
        message: "Account already verified"
      });
    }

    // Generate new token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    res.json({
      success: true,
      message: "New verification token generated",
      data: {
        verificationToken: verificationToken,
        verifyEndpoint: `/api/auth/verify-email/${verificationToken}`,
        expiresIn: "24 hours"
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// MANUAL VERIFICATION (for admin/testing)
exports.manualVerify = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "User manually verified",
      data: {
        userId: user._id,
        email: user.email,
        isVerified: true
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// CHECK VERIFICATION STATUS
exports.checkVerification = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('isVerified email name');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        requiresVerification: !user.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// UPDATE ALERT PREFERENCES (NO EMAIL)
exports.updateAlertPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { smsAlerts, pushAlerts, phoneNumbers } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update preferences (NO emailAlerts since no SMTP)
    user.alertPreferences = {
      emailAlerts: false,  // Always false without SMTP
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