const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

exports.sendSMS = onRequest({cors: true}, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method Not Allowed"});
  }

  try {
    const {customerPath, message} = req.body;

    if (!customerPath || !message) {
      return res.status(400).json({
        error: "customerPath and message are required",
      });
    }

    const customerDoc = await db.doc(customerPath).get();
    if (!customerDoc.exists()) {
      return res.status(404).json({
        error: "Customer not found at the specified path",
      });
    }

    const phoneNumber = customerDoc.data().phoneNumber;
    if (!phoneNumber) {
      return res.status(400).json({error: "Customer has no phone number"});
    }

    await db.collection("messages").add({
      to: phoneNumber,
      body: message,
    });

    return res.json({success: true, message: "SMS queued for sending"});
  } catch (error) {
    console.error("Error sending SMS:", error);
    return res.status(500).json({
      error: `Failed to queue SMS: ${error.message}`,
    });
  }
});
