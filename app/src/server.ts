const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

require("dotenv").config();

var corsOptions = {
	origin: [
    "http://localhost:1234",
  ]
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

require('./routes.ts')(app);

// set port, listen for requests
const PORT = process.env.PORT || 5959;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});