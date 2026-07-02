exports.getProfile = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const user = req.user.toObject();
    
    delete user.password;
    delete user.__v; 
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('❌ Error in getProfile:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile' 
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.__v;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('❌ Error in updateProfile:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile' 
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await req.user.deleteOne();
    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error in deleteAccount:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete account' 
    });
  }
};