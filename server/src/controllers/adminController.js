const User = require('../models/User');

exports.changePlan = async (req, res) => {
  try {
    // Only admins can change plans (including their own)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin only' });
    }

    const { plan, userId } = req.body;  // optionally allow admin to target another user
    if (!['FREE', 'PREMIUM', 'ADMIN'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    // If userId is provided, change that user; otherwise change the requesting admin
    const targetId = userId || req.user.id;
    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.plan = plan;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};