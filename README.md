
**Objective:**
Create an MVC-based application that demonstrates the correct interaction with **Nokia API endpoints**. The application will include basic functionality to authenticate, retrieve, and display data from Nokia APIs.

---

### **Features**:

1. **User Authentication**:
   - **Model**: Create a `User` model that stores user credentials for authentication.
   - **Controller**: Implement an `AuthController` for handling user login and authentication requests.
   - **View**: A simple login form where users can input their credentials (username and password).

2. **Integration with Nokia APIs**:
   - **Model**: Create a `NokiaAPIModel` that interacts with Nokia API endpoints (Location, Device Status, etc.).
   - **Controller**: Implement a `NokiaController` that fetches data from Nokia APIs, such as location verification or device status.
   - **View**: A page that displays the result of API calls (e.g., location data, device status).

3. **Location Data Retrieval**:
   - **Model**: `LocationModel` to store and handle location data retrieved from the **Nokia Location Verification API**.
   - **Controller**: A method in `NokiaController` that calls the Nokia API, retrieves the location data, and passes it to the view.
   - **View**: Display the current location on the UI, formatted or on a map (optional).

4. **Device Status Monitoring**:
   - **Model**: `DeviceStatusModel` to store device status data retrieved from the **Nokia Device Status API**.
   - **Controller**: A method in `NokiaController` that checks the device's connection status via the API.
   - **View**: Display the device’s connectivity status on the UI.

5. **Error Handling**:
   - Proper error handling in the controllers when interacting with the Nokia API, including API failures and invalid responses.
   - Display error messages in the view in case of issues.

---

### **Tech Stack:**

1. **Frontend**:
   - **HTML/CSS** for the basic structure and styling of the pages.
   - **JavaScript** for dynamic content loading (using **Fetch API** or **Axios** for AJAX calls).
   - **Bootstrap** for simple and responsive UI components.

2. **Backend**:
   - **Node.js** with **Express.js** for the backend framework.
   - **Nokia API SDK** or custom API client (e.g., Axios, Fetch) for interacting with Nokia endpoints.
   - **EJS** or **Pug** as a view engine for rendering HTML views.

3. **Database**:
   - **MongoDB** (or an in-memory database) for storing user data (optional, if required for storing login information).

4. **External APIs**:
   - **Nokia Location Verification API** for retrieving location data.
   - **Nokia Device Status API** for retrieving device status.

---

### **Implementation Steps**:

1. **Create the `User` Model**:
   - Define a schema for the `User` model (if using MongoDB).
   - Implement methods to handle user authentication.

2. **Set Up Authentication Controller (`AuthController`)**:
   - Create routes for login and session management.
   - Implement login functionality, validating user credentials and starting a session.

3. **Integrate Nokia API**:
   - Create the `NokiaAPIModel` to interact with the Nokia Location Verification and Device Status APIs.
   - Implement methods to call API endpoints and retrieve the necessary data.

4. **Create `NokiaController`**:
   - Implement methods to fetch data from the Nokia API endpoints:
     - **Location API**: Retrieve and display location data.
     - **Device Status API**: Retrieve and display device status.
   - Handle errors and failures when calling the APIs.

5. **Create Views**:
   - Create views to:
     - Display the login form.
     - Display fetched location and device status information.
   - Ensure data is presented clearly and handle any errors gracefully.

6. **Routing**:
   - Set up routes for login (`/login`), fetching location (`/location`), and device status (`/device-status`).
   - Connect each route to the appropriate controller action.

7. **Error Handling**:
   - Ensure proper error handling if the Nokia API endpoints fail (e.g., network errors, invalid responses).
   - Display user-friendly error messages in the view.

8. **Deploy**:
   - Deploy the application to a cloud platform (e.g., Heroku) for easy access and testing.

---

### **Sample Code Structure**:

```
/project
  /controllers
    authController.js
    nokiaController.js
  /models
    userModel.js
    locationModel.js
    deviceStatusModel.js
  /views
    login.ejs
    locationView.ejs
    deviceStatusView.ejs
  /public
    /css
    /js
  /routes
    authRoutes.js
    nokiaRoutes.js
  app.js
  package.json
```

---

### **Sample Code Snippets**:

**1. `authController.js` (Authentication Logic)**:
```js
const User = require('../models/userModel');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);

  if (!user || user.password !== password) {
    return res.status(401).send('Invalid credentials');
  }

  req.session.user = user;
  res.redirect('/location');
};
```

**2. `nokiaController.js` (Nokia API Logic)**:
```js
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
```

**3. `locationView.ejs` (Location Display)**:
```html
<h1>Current Location</h1>
<p>Latitude: <%= location.latitude %></p>
<p>Longitude: <%= location.longitude %></p>
```

**4. `deviceStatusView.ejs` (Device Status Display)**:
```html
<h1>Device Status</h1>
<p>Status: <%= status %></p>
```

