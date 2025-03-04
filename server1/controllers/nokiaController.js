const axios = require('axios');

exports.getLocation = async (req, res) => {
  try {
    const response = await axios.get('https://api.nokia.com/location', {
      params: { deviceId: req.session.user.deviceId },
    });
    res.render('locationView', { location: response.data });
  } catch (error) {
    res.status(500).send('Error fetching location data');
  }
};

exports.getDeviceStatus = async (req, res) => {
  try {
    const response = await axios.get('https://api.nokia.com/device-status', {
      params: { deviceId: req.session.user.deviceId },
    });
    res.render('deviceStatusView', { status: response.data.status });
  } catch (error) {
    res.status(500).send('Error fetching device status');
  }
};
