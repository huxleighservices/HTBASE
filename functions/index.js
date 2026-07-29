const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {Resend} = require("resend");

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

const resendApiKey = defineSecret("RESEND_API_KEY");

exports.sendSMS = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).send("ok");
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

// Widget type -> display label, matching the "Widget Notifications"
// toggles in src/components/portal/notification-settings-sheet.tsx and
// the widgetType values written by src/lib/activity-log.ts.
const WIDGET_LABELS = {
  "base": "Base (ERP Hub)",
  "leads": "Leads",
  "inventory-manager": "Inventory Manager",
  "task-pipeline": "Task Pipeline",
  "ar-collections": "A/R Collections",
  "opac": "OPAC Tracker",
  "builds": "Builds Tracker",
  "contracts": "Contracts",
  "base-doc": "Base Doc",
};

/**
 * Escapes a string for safe inclusion in HTML.
 * @param {string} value Raw text.
 * @return {string} HTML-escaped text.
 */
function escapeHtml(value) {
  return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
}

/**
 * Builds the digest email body from activity entries grouped by widget type.
 * @param {string} firmName Client firm name.
 * @param {Object<string, Array<Object>>} groupedEntries Activity entries
 *   keyed by widget type.
 * @return {string} HTML email body.
 */
function buildDigestHtml(firmName, groupedEntries) {
  const sections = Object.entries(groupedEntries).map(
      ([widgetType, entries]) => {
        const label = WIDGET_LABELS[widgetType] || widgetType;
        const items = entries
            .map((entry) => `<li>${escapeHtml(entry.summary)}</li>`)
            .join("");
        return `<h3 style="margin:16px 0 4px;">${escapeHtml(label)}</h3>` +
            `<ul style="margin:0;padding-left:20px;">${items}</ul>`;
      }).join("");

  return `<div><p>Here's a summary of the last 24 hours of activity ` +
      `for <strong>${escapeHtml(firmName)}</strong>:</p>${sections}</div>`;
}

// Runs once a day, gathers each client's activityLog entries from the last
// 24 hours, filters them against that client's notificationSettings/config
// (baseEnabled + per-widget toggles set in the "Notification Settings"
// panel), and sends one summary email per client. Schedule/timezone below
// is a placeholder — adjust to whatever cadence makes sense.
exports.sendDailyDigest = onSchedule(
    {
      schedule: "0 7 * * *",
      timeZone: "America/New_York",
      secrets: [resendApiKey],
    },
    async () => {
      const resend = new Resend(resendApiKey.value());
      const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

      const clientsSnap = await db.collectionGroup("clients").get();

      for (const clientDoc of clientsSnap.docs) {
        const clientPath = clientDoc.ref.path;
        const client = clientDoc.data();

        try {
          const configPath = `${clientPath}/notificationSettings/config`;
          const configSnap = await db.doc(configPath).get();
          if (!configSnap.exists) continue;
          const config = configSnap.data();
          if (!config.email) continue;

          const activitySnap = await db
              .collection(`${clientPath}/activityLog`)
              .where("createdAt", ">=", cutoff)
              .get();

          if (activitySnap.empty) continue;

          const grouped = {};
          activitySnap.docs.forEach((entryDoc) => {
            const entry = entryDoc.data();
            const widgetType = entry.widgetType;
            const allowed = widgetType === "base" ?
              config.baseEnabled :
              config.widgets && config.widgets[widgetType];
            if (!allowed) return;
            if (!grouped[widgetType]) grouped[widgetType] = [];
            grouped[widgetType].push(entry);
          });

          if (Object.keys(grouped).length === 0) continue;

          await resend.emails.send({
            from: "HTBase <service@huxleigh.com>",
            to: [config.email],
            subject: `${client.firmName}: Daily Activity Summary`,
            html: buildDigestHtml(client.firmName, grouped),
          });
        } catch (err) {
          console.error(`Daily digest failed for client ${clientPath}:`, err);
        }
      }
    },
);
