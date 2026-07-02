const User = require('../models/User');

exports.changePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'PREMIUM', 'ADMIN'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    // In a real app, you'd check if the requester is admin.
    // Here we allow any authenticated user to change their own plan for demo.
    const user = await User.findById(req.user.id);
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