const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

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
 
async function handleSubmission(state, component, url) {
  try {
    const res = await callServer(url, state.data);
    handleServerResponse(res, component);
  } catch (error) {
    console.error(error);
  }
}

async function initCheckout() {
  try {
    const paymentMethodsResponse = await callServer("/api/getPaymentMethods");
    const configuration = {
      paymentMethodsResponse: paymentMethodsResponse,
      clientKey: process.env.CLIENT_KEY,
      locale: "en_US",
      environment: "test",
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
      },
      onAdditionalDetails: (state, component) => {
        handleSubmission(state, component, "/api/submitAdditionalDetails");
      },
    };
    const checkout = new AdyenCheckout(configuration);
    checkout.create("dropin").mount(document.getElementById("#dropin-container"));
  } catch (error) {
    console.error(error);
  }
}

initCheckout();