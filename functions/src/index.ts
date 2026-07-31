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
 * Trigger: auto-queue email notifications when a candidate's pipeline stage changes.
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
      // Find the email template associated with this pipeline stage
      const templateQuery = await db.collection("templates")
        .where("stage", "==", newStage)
        .limit(1)
        .get();

      if (templateQuery.empty) {
        logger.info(`No template registered for stage: ${newStage}. Notification skipped.`);
        return;
      }

      const template = templateQuery.docs[0].data();
      let emailBody = template.body || "";
      let emailSubject = template.subject || "";

      // Perform dynamic merge tags expansion
      const mergeValues: Record<string, string> = {
        Vendor_Name: afterData.contactName || afterData.companyName || "Partner",
        Language: afterData.languages?.join(", ") || "Languages",
        Adjusted_Rate: afterData.adjustedRate ? `$${afterData.adjustedRate}` : "Negotiated",
        Project_Link: `https://mlconnections.com/portal/onboarding/${vendorId}`,
        NDA_Status: afterData.stage === 'sourced' || afterData.stage === 'nda_pending' ? "Signature Required" : "NDA Verified"
      };

      Object.entries(mergeValues).forEach(([key, val]) => {
        emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), val);
        emailSubject = emailSubject.replace(new RegExp(`{{${key}}}`, 'g'), val);
      });

      // Write queued email notification to the notifications collection
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

      logger.info(`Successfully queued notification for candidate ${vendorId} at stage ${newStage}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to execute stage trigger automations.", { error: msg });
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
