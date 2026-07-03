// server/src/controllers/adminController.js
const User = require('../models/User');
const Analytics = require('../models/Analytics');

// ============ CHANGE USER PLAN ============
exports.changePlan = async (req, res) => {
  try {
    // ✅ Strict admin check - CRITICAL SECURITY FIX
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: Admin access required' 
      });
    }

    const { plan, userId } = req.body;
    
    // Validate plan
    const validPlans = ['FREE', 'PREMIUM', 'ADMIN'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid plan. Must be FREE, PREMIUM, or ADMIN' 
      });
    }

    // If userId is provided, change that user; otherwise change the requesting admin
    const targetId = userId || req.user.id;
    const user = await User.findById(targetId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const oldPlan = user.plan;
    user.plan = plan;
    await user.save();

    // Log the plan change
    console.log(`📊 Admin ${req.user.email} changed plan for ${user.email} from ${oldPlan} to ${plan}`);

    res.json({
      success: true,
      message: `Plan changed from ${oldPlan} to ${plan}`,
      data: user
    });
  } catch (err) {
    console.error('❌ Error changing plan:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ============ GET ALL USERS ============
exports.getAllUsers = async (req, res) => {
  try {
    // ✅ Strict admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: Admin access required' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ============ UPDATE USER ROLE ============
exports.updateUserRole = async (req, res) => {
  try {
    // ✅ Strict admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: Admin access required' 
      });
    }

    const { userId, role } = req.body;

    // Validate role
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role. Must be user or admin' 
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change your own role' 
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log(`👤 Admin ${req.user.email} changed role for ${user.email} from ${oldRole} to ${role}`);

    res.json({
      success: true,
      message: `Role changed from ${oldRole} to ${role}`,
      data: user
    });
  } catch (err) {
    console.error('❌ Error updating user role:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ============ DELETE USER ============
exports.deleteUser = async (req, res) => {
  try {
    // ✅ Strict admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: Admin access required' 
      });
    }

    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete your own account' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete user's analytics data as well
    await Analytics.deleteMany({ userId });

    await user.deleteOne();

    console.log(`🗑️ Admin ${req.user.email} deleted user ${user.email}`);

    res.json({
      success: true,
      message: `User ${user.email} deleted successfully`
    });
  } catch (err) {
    console.error('❌ Error deleting user:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};