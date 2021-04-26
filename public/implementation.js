const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;
const paymentMethodsResponse = document.getElementById("paymentMethodsResponse").innerHTML;

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
      clientKey,
      locale: "en-NL",
      environment: "test",
      paymentMethodsConfiguration: {
        card: {
          name: "AMEX",
          brands: ['amex'],
          amount: {
            value: 1000,
            currency: "EUR",
          },
          hasHolderName: true,
          positionHolderNameOnTop: true,
          data: {
            holderName: "Claudio dos Santos"
          },
        },
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
    checkout.create(type).mount(document.getElementById(type));
  } catch (error) {
    console.error(error);
  }
}

initCheckout();