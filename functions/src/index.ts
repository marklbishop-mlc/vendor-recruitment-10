import { onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Explicitly target the named database in the admin SDK
const db = getFirestore("mlc-vendor-recruitment-db");

/**
 * REST API for diagnostic checking of the recruitment backend.
 */
export const checkRecruitmentStatus = onRequest(
  {
    cors: true,
  },
  async (request, response) => {
    logger.info("Recruitment status check API invoked.", { structuredData: true });
    
    try {
      const snapshot = await db.collection("vendors").limit(5).get();
      const count = snapshot.size;
      
      response.status(200).json({
        success: true,
        message: "MLC Vendor Onboarding Backend functions are online.",
        database: "mlc-vendor-recruitment-db",
        activeCandidates: count
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to query isolated database.", { error: errorMessage });
      response.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * Helper to evaluate a custom workflow condition on a candidate's data object.
 */
function evaluateCondition(candidateData: any, field: string, operator: string, value: string): boolean {
  const actualValue = candidateData[field];
  
  // Format target value for comparison
  let targetValue: any = value;
  if (value === 'true') targetValue = true;
  if (value === 'false') targetValue = false;
  if (!isNaN(Number(value)) && typeof actualValue === 'number') targetValue = Number(value);

  if (operator === '==') {
    return actualValue === targetValue;
  }
  if (operator === '!=') {
    return actualValue !== targetValue;
  }
  if (operator === 'empty') {
    return actualValue === undefined || actualValue === null || actualValue === '';
  }
  if (operator === 'not_empty') {
    return actualValue !== undefined && actualValue !== null && actualValue !== '';
  }
  
  return false;
}

/**
 * Trigger: Evaluates complex workflow rules and conditional actions when a candidate's stage changes.
 */
export const onVendorStageChange = onDocumentUpdated(
  {
    database: "mlc-vendor-recruitment-db",
    document: "vendors/{vendorId}"
  },
  async (event) => {
    const change = event.data;
    if (!change) {
      logger.warn("No change data received in stage trigger.");
      return;
    }

    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only trigger if the workflow stage has changed
    if (beforeData?.stage === afterData?.stage) {
      return;
    }

    const newStage = afterData?.stage;
    const vendorId = event.params.vendorId;

    logger.info(`Candidate ${vendorId} stage updated from ${beforeData?.stage} to ${newStage}`);

    try {
      // Query all workflow actions registered for this new stage
      const actionsQuery = await db.collection("workflow_actions")
        .where("triggerStage", "==", newStage)
        .get();

      if (actionsQuery.empty) {
        logger.info(`No workflow action rules registered for stage: ${newStage}.`);
        return;
      }

      logger.info(`Found ${actionsQuery.size} potential actions for stage: ${newStage}. Evaluating rules...`);

      for (const actionDoc of actionsQuery.docs) {
        const action = actionDoc.data();
        if (!action.isActive) continue;

        // Evaluate rule conditions
        const isMatched = evaluateCondition(afterData, action.field, action.operator, action.value);

        if (!isMatched) {
          logger.info(`Rule "${action.name}" condition not met for candidate ${vendorId}.`);
          continue;
        }

        logger.info(`Rule "${action.name}" matched! Executing action type: ${action.actionType}`);

        if (action.actionType === 'send_email' && action.templateId) {
          // Fetch associated email template
          const templateDoc = await db.collection("templates").doc(action.templateId).get();
          if (!templateDoc.exists) {
            logger.error(`Template ID ${action.templateId} not found in database.`);
            continue;
          }

          const template = templateDoc.data();
          let emailBody = template?.body || "";
          let emailSubject = template?.subject || "";

          // Perform dynamic merge tags expansion
          const languagesStr = afterData.workingLanguages
            ? afterData.workingLanguages.map((l: any) => `${l.language} (${l.proficiency})`).join(", ")
            : "English";

          const mergeValues: Record<string, string> = {
            Vendor_Name: afterData.contactName || "Specialist",
            Language: languagesStr,
            Adjusted_Rate: afterData.adjustedRate ? `$${afterData.adjustedRate}` : "Negotiated",
            Project_Link: `https://mlconnections.com/portal/onboarding/${vendorId}`,
            NDA_Status: afterData.hasSignedNda ? "NDA Verified" : "NDA Missing / Required"
          };

          Object.entries(mergeValues).forEach(([key, val]) => {
            emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), val);
            emailSubject = emailSubject.replace(new RegExp(`{{${key}}}`, 'g'), val);
          });

          // Queue emails based on recipientType
          const sendToVendor = action.recipientType === 'vendor' || action.recipientType === 'both';
          const sendToMlc = action.recipientType === 'mlc' || action.recipientType === 'both';

          if (sendToVendor) {
            const notificationRef = db.collection("notifications").doc();
            await notificationRef.set({
              id: notificationRef.id,
              vendorId,
              email: afterData.email,
              subject: emailSubject,
              body: emailBody,
              status: "queued",
              createdAt: new Date().toISOString()
            });
            logger.info(`Queued email to Vendor: ${afterData.email}`);
          }

          if (sendToMlc) {
            const notificationRef = db.collection("notifications").doc();
            await notificationRef.set({
              id: notificationRef.id,
              vendorId,
              email: "vm@mlconnections.com",
              subject: `[MLC Copy] ${emailSubject}`,
              body: `--- Copy of mail sent to Candidate: ${afterData.contactName} (${afterData.email}) ---\n\n` + emailBody,
              status: "queued",
              createdAt: new Date().toISOString()
            });
            logger.info(`Queued email to MLC Office: vm@mlconnections.com`);
          }
        }

        if (action.actionType === 'update_status' && action.updateValue) {
          // Auto update status field
          await change.after.ref.update({
            status: action.updateValue,
            updatedAt: new Date().toISOString()
          });
          logger.info(`Successfully auto-updated status to ${action.updateValue} via rule "${action.name}"`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to execute stage trigger workflow actions.", { error: msg });
    }
  }
);

/**
 * Trigger: Automatic mail processor mock.
 * Detects new queued documents in notifications and simulates sending them out.
 */
export const processMailQueue = onDocumentCreated(
  {
    database: "mlc-vendor-recruitment-db",
    document: "notifications/{notificationId}"
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data?.status !== 'queued') return;

    logger.info(`Processing mail ID ${event.params.notificationId} to ${data.email}`);

    try {
      // Simulate mail transport latency
      await new Promise(resolve => setTimeout(resolve, 800));

      // Update mail delivery status
      await snap.ref.update({
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      logger.info(`Mail ID ${event.params.notificationId} successfully sent.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Mail dispatch failed for ID ${event.params.notificationId}`, { error: msg });
      
      await snap.ref.update({
        status: 'failed',
        error: msg
      });
    }
  }
);
