exports.getProfile = (req, res) => {
  const user = req.user.toObject();
  delete user.password;
  res.json(user);
};