require("dotenv").config();
const express = require("express");

const webhook = require("./routes/webhook");
const nextechRoutes = require("./routes/nextechRoutes");
const hubspotRoutes = require("./routes/hubspotRoutes");

const app = express();
app.use(express.json());

app.use("/webhook", webhook);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
