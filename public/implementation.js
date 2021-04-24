// import AdyenCheckout from '@adyen/adyen-web';
// import '@adyen/adyen-web/dist/adyen.css';

const { default: Checkout } = require("@adyen/api-library/lib/src/services/checkout");


// CALL SERVER
// -----------

async function callServer(url, data) {
    const res = await fetch(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : "",
      headers: {
        "Content-Type": "application/json",
      },
    });
   
    return await res.json();
  }


// HANDLE SERVER RESPONSE
// ----------------------

function handleServerResponse(res, component) {
    if (res.action) {
      component.handleAction(res.action);
    } else {
      switch (res.resultCode) {
        case "Authorised":
          window.location.href = "/result/success";
          break;
        case "Pending":
        case "Received":
          window.location.href = "/result/pending";
          break;
        case "Refused":
          window.location.href = "/result/failed";
          break;
        default:
          window.location.href = "/result/error";
          break;
      }
    }
  }


  // HANDLE SUBMISSION
  // -----------------

  async function handleSubmission(state, component, url) {
    try {
      const res = await callServer(url, state.data);
      handleServerResponse(res, component);
    } catch (error) {
      console.error(error);
    }
  }

// From tutorial video
const paymentMethodsResponse = JSON.parse(document.getElementById("paymentMethodsResponse").innerHTML);
const clientKey = document.getElementById("clientKey").innerHTML;

// DROP-IN CONFIGURATION
// ---------------------

async function initCheckout() {
    try {
      const paymentMethodsResponse = await callServer("/api/getPaymentMethods");
      const configuration = {
        paymentMethodsResponse: paymentMethodsResponse,
// Link to .env file for client_key!?
        clientKey: "YOUR_CLIENT_KEY",
        locale: "en_US",
        environment: "test",
// This is where three configurations needs to be done
        paymentMethodsConfiguration: {
          card: {
            showPayButton: true,
            hasHolderName: true,
            holderNameRequired: true,
            name: "Credit or debit card",
            amount: {
              value: 1000,
              currency: "EUR"
            }
          }
        },
        onSubmit: (state, component) => {
          if (state.isValid) {
            handleSubmission(state, component, "/api/initiatePayment");
          }
        const checkout = new AdyenCheckout(configuration);
        checkout.create("dropin").mount(document.getElementById("#dropin-container"));
        },
        onAdditionalDetails: (state, component) => {
          handleSubmission(state, component, "/api/submitAdditionalDetails");
        },
      };
    } catch (error) {
      console.error(error);
    }
  }
   
  const checkout = new AdyenCheckout(configuration);

  const integration = checkout.create("dropin-container").mount(document.getElementById("dropin-container"))
  
   
  