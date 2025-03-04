const User = require('../models/userModel');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);

  if (!user || user.password !== password) {
    return res.status(401).send('Invalid credentials');
  }

  req.session.user = user;
  res.redirect('/nokia/location');
};
