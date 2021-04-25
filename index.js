const express = require("express");
const path = require("path");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const morgan = require("morgan");
// DELETE because the ref is given in email
const { uuid } = require("uuidv4");
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");
const app = express();

// Set up request logging
app.use(morgan("dev"));
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Serve client from build folder
app.use(express.static(path.join(__dirname, "/public")));

// Enables environment variables by parsing the .env file and assigning it to process.env
dotenv.config({
  path: "./.env",
});

// Adyen Node.js API library boilerplate (configuration, etc.)
const config = new Config();
config.apiKey = process.env.CHECKOUT_APIKEY;
const client = new Client({ config });
client.setEnvironment("TEST");
const checkout = new CheckoutAPI(client);

app.engine(
    "handlebars",
    hbs({
        defaultLayout: "main",
        layoutsDir: __dirname + "/views/layouts",
        helpers: require("./util/helpers"),            
    })
);

app.set("view engine", "handlebars");

const paymentDataStore = {};

app.get("/", (req, res) =>
  res.render("payment", {
    type: "dropin",
    clientKey: process.env.CLIENT_KEY,
  })
);

// Get payment methods
app.post("/api/getPaymentMethods", async (req, res) => {       
  try {
    const response = await checkout.paymentMethods({
      channel: "Web",
      merchantAccount: process.env.MERCHANT_ACCOUNT,
    });
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});
 
app.post("/api/initiatePayment", async (req, res) => {
  try {
    // unique ref for the transaction
    const orderRef = uuidv4();
    // Ideally the data passed here should be computed based on business logic
    const response = await checkout.payments({
      amount: { currency: "EUR", value: 1000 }, // value is 10€ in minor units
      reference: orderRef, // required
      merchantAccount: process.env.MERCHANT_ACCOUNT, // required
      channel: "Web", // required
      additionalData: {
        // required for 3ds2 native flow
        allow3DS2: true,
      },
      // we pass the orderRef in return URL to get paymentData during redirects
      // UPDATE - Email Url
      returnUrl: `http://localhost:${process.env.PORT}/api/handleShopperRedirect?orderRef=${orderRef}`, // required for redirect flow
      browserInfo: req.body.browserInfo,
      paymentMethod: req.body.paymentMethod // required
    });
 
    const { action } = response;
 
    if (action) {
      paymentDataStore[orderRef] = action.paymentData;
    }
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});


// handle both POST & GET requests
app.all("/api/handleShopperRedirect", async (req, res) => {
    // Create the payload for submitting payment details
    const orderRef = req.query.orderRef;
    const redirect = req.method === "GET" ? req.query : req.body;
    const details = {};
    if (redirect.redirectResult) {
      details.redirectResult = redirect.redirectResult;
    } else {
      details.MD = redirect.MD;
      details.PaRes = redirect.PaRes;
    }
   
    const payload = {
      details,
      paymentData: paymentDataStore[orderRef],
    };
   
    try {
      const response = await checkout.paymentsDetails(payload);
      // Conditionally handle different result codes for the shopper
      switch (response.resultCode) {
        case "Authorised":
          res.redirect("/result/success");
          break;
        case "Pending":
        case "Received":
          res.redirect("/result/pending");
          break;
        case "Refused":
          res.redirect("/result/failed");
          break;
        default:
          res.redirect("/result/error");
          break;
      }
    } catch (err) {
      console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
      res.redirect("/result/error");
    }
  });

  app.post("/api/submitAdditionalDetails", async (req, res) => {
    // Create the payload for submitting payment details
    const payload = {
      details: req.body.details,
      paymentData: req.body.paymentData,
    };
   
    try {
      // Return the response back to client (for further action handling or presenting result to shopper)
      const response = await checkout.paymentsDetails(payload);
      res.json(response);
    } catch (err) {
      console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
      res.status(err.statusCode).json(err.message);
    }
  });

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));