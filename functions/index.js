
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

exports.sendSMS = onCall(async (request) => {
  const {customerPath, message} = request.data;

  if (!customerPath || !message) {
    // Use an HttpsError for client-facing errors
    throw new functions.https.HttpsError("invalid-argument", "customerPath and message are required.");
  }

  try {
    // Get customer phone number from the provided Firestore path
    const customerDoc = await db.doc(customerPath).get();
    if (!customerDoc.exists()) {
      throw new functions.https.HttpsError("not-found", "Customer not found at the specified path.");
    }

    const phoneNumber = customerDoc.data().phoneNumber;
    if (!phoneNumber) {
        throw new functions.https.HttpsError("failed-precondition", "Customer has no phone number.");
    }

    // Write to messages collection for Twilio extension to pick up
    // The Twilio extension expects the 'to' number in E.164 format.
    // The frontend normalizes it, so we can use it directly.
    await db.collection("messages").add({
      to: phoneNumber,
      body: message,
    });

    return {success: true, message: "SMS queued for sending"};
  } catch (error) {
    console.error("Error sending SMS via function:", error);
    // If it's already an HttpsError, rethrow it. Otherwise, wrap it.
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    const errorMsg = `Failed to queue SMS.`;
    throw new functions.https.HttpsError("internal", errorMsg, error);
  }
});
