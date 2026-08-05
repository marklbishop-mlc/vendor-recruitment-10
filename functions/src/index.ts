import { onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin SDK
initializeApp();

// Explicitly target the named database in the admin SDK
const db = getFirestore("mlc-vendor-recruitment-db");

// Load service account file with fail-safe fallback
let serviceAccount: any;
try {
  serviceAccount = require("./email-service-account.json");
} catch (e) {
  try {
    const path = require("path");
    const fallbackPath = path.resolve(__dirname, "../src/email-service-account.json");
    serviceAccount = require(fallbackPath);
  } catch (err) {
    logger.error("Failed to load service account credentials key from all standard locations.", err);
  }
}

const AUTH_USER_EMAIL = "mark@mlconnections.com";
const DISPLAY_FROM_EMAIL = "vm@mlconnections.com";

/**
 * Helper to build OAuth2 transporter
 */
const createNodemailerTransport = (smtpConfig?: any) => {
  if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port) || 465,
      secure: (Number(smtpConfig.port) || 465) === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      }
    });
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: AUTH_USER_EMAIL,
      serviceClient: serviceAccount?.client_id || "",
      privateKey: serviceAccount?.private_key || "",
    }
  });
};

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
      
      // Execute Automated SLA Nudges if active
      let nudgesQueued = 0;
      const configSnap = await db.collection("settings").doc("global_config").get();
      if (configSnap.exists) {
        const config = configSnap.data();
        const slaConfig = config?.slaNudges;

        if (slaConfig?.enabled && slaConfig?.mode === 'automated') {
          const nowMs = Date.now();
          const defaultStageConfigs: Record<string, any> = {
            application: { enabled: true, waitDays: 3, maxNudges: 2 },
            nda: { enabled: true, waitDays: 4, maxNudges: 3 },
            grading: { enabled: true, waitDays: 4, maxNudges: 2 },
            contract: { enabled: true, waitDays: 3, maxNudges: 2 },
          };

          const stageConfigs = slaConfig.stageConfigs || defaultStageConfigs;

          for (const [stageKey, stgCfg] of Object.entries(stageConfigs)) {
            const stageSla = stgCfg as any;
            if (!stageSla?.enabled) continue;

            const waitDays = Number(stageSla.waitDays) || 4;
            const maxNudges = Number(stageSla.maxNudges) || 3;

            const stageVendors = await db.collection("vendors")
              .where("stage", "==", stageKey)
              .get();

            for (const vDoc of stageVendors.docs) {
              const vData = vDoc.data();

              // Skip NDA stage if NDA is already signed
              if (stageKey === "nda" && vData.hasSignedNda) continue;
              // Skip onboarded candidates
              if (stageKey === "onboarded") continue;

              const stageEnteredMs = vData.stageEnteredAt 
                ? new Date(vData.stageEnteredAt).getTime()
                : new Date(vData.updatedAt || vData.submittedAt || Date.now()).getTime();

              const daysInStage = (nowMs - stageEnteredMs) / (1000 * 60 * 60 * 24);
              const currentNudges = Number(vData.nudgeCountInStage ?? vData.nudgeCount) || 0;
              const nextNudgeNumber = currentNudges + 1;

              if (nextNudgeNumber > maxNudges) continue;

              // Nudge #1 triggers after 1 * waitDays, Nudge #2 after 2 * waitDays, Nudge #3 after 3 * waitDays
              const requiredDays = nextNudgeNumber * waitDays;
              const lastNudgeMs = vData.lastNudgeAt ? new Date(vData.lastNudgeAt).getTime() : 0;
              const daysSinceLastNudge = (nowMs - lastNudgeMs) / (1000 * 60 * 60 * 24);

              if (daysInStage >= requiredDays && (lastNudgeMs === 0 || daysSinceLastNudge >= (waitDays - 0.2))) {
                const ndaUrl = `https://mlc-vendor-recruitment.web.app/portal/nda/${vDoc.id}`;
                const notificationRef = db.collection("notifications").doc();

                let subject = `[Reminder #${nextNudgeNumber}] Application Update - Multilingual Connections (${vData.contactName || "Specialist"})`;
                let body = `Hi ${vData.contactName || "Specialist"},\n\nWe are following up regarding your recruitment application with Multilingual Connections (Stage: ${stageKey.toUpperCase()}).\n\nPlease check your portal to complete the required steps or reply to this message.\n\nBest regards,\nMLC Recruitment Team`;

                if (stageKey === "nda") {
                  subject = `[Reminder #${nextNudgeNumber}] Action Required: Sign NDA for Multilingual Connections (${vData.contactName || "Specialist"})`;
                  body = `Hi ${vData.contactName || "Specialist"},\n\nWe noticed you haven't completed your Non-Disclosure Agreement (NDA) yet.\n\nPlease click the link below to review and sign your NDA online so we can proceed with your application:\n${ndaUrl}\n\nThank you,\nMLC Recruitment & Compliance Team`;
                } else if (stageKey === "grading") {
                  subject = `[Reminder #${nextNudgeNumber}] Evaluation Test Status - Multilingual Connections`;
                  body = `Hi ${vData.contactName || "Specialist"},\n\nThis is a friendly reminder regarding your ongoing linguistic assessment for Multilingual Connections.\n\nPlease reach out if you have any questions or require additional time.\n\nBest regards,\nMLC Evaluation Team`;
                }

                await notificationRef.set({
                  id: notificationRef.id,
                  vendorId: vDoc.id,
                  vendorName: vData.contactName || "Specialist",
                  vendorEmail: vData.email || "",
                  actionName: `[Auto SLA Nudge #${nextNudgeNumber}] Stage: ${stageKey.toUpperCase()}`,
                  templateId: "sla-stage-reminder",
                  templateName: `SLA Stage Nudge (${stageKey})`,
                  recipientType: "vendor",
                  email: vData.email || "",
                  subject,
                  body,
                  status: "queued",
                  createdAt: new Date().toISOString()
                });

                await vDoc.ref.update({
                  nudgeCountInStage: currentNudges + 1,
                  nudgeCount: (Number(vData.nudgeCount) || 0) + 1,
                  lastNudgeAt: new Date().toISOString()
                });

                nudgesQueued++;
                logger.info(`Auto SLA Nudge #${nextNudgeNumber} queued for candidate ${vData.contactName} (${vDoc.id}) in stage "${stageKey}"`);
              }
            }
          }
        }
      }

      response.status(200).json({
        success: true,
        message: "MLC Vendor Onboarding Backend functions are online.",
        database: "mlc-vendor-recruitment-db",
        activeCandidates: count,
        nudgesQueued
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
  if (operator === 'always' || field === 'always') {
    return true;
  }

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

    const stageChanged = beforeData?.stage !== afterData?.stage;
    const stageStatusChanged = beforeData?.stageStatus !== afterData?.stageStatus;

    // Only trigger if either the stage or stageStatus has changed
    if (!stageChanged && !stageStatusChanged) {
      return;
    }

    const currentStage = afterData?.stage;
    const currentStageStatus = afterData?.stageStatus || 'started';
    const vendorId = event.params.vendorId;

    logger.info(`Candidate ${vendorId} updated: Stage=${currentStage}, StageStatus=${currentStageStatus}`);

    // Skip automated backend email dispatch if frontend handled custom dispatch or user selected "Confirm (No Email)"
    if (afterData?.suppressWorkflowEmail) {
      logger.info(`Candidate ${vendorId} updated with suppressWorkflowEmail flag. Skipping automatic backend email dispatch.`);
      return;
    }

    try {
      // Query all workflow actions registered for this stage
      const actionsQuery = await db.collection("workflow_actions")
        .where("triggerStage", "==", currentStage)
        .get();

      if (actionsQuery.empty) {
        logger.info(`No workflow action rules registered for stage: ${currentStage}.`);
        return;
      }

      logger.info(`Found ${actionsQuery.size} potential actions for stage: ${currentStage}. Evaluating rules...`);

      for (const actionDoc of actionsQuery.docs) {
        const action = actionDoc.data();
        if (!action.isActive) continue;

        // Check if rule's triggerStatus matches currentStageStatus
        const actionTriggerStatus = action.triggerStatus || 'started';
        if (actionTriggerStatus !== 'any' && actionTriggerStatus !== currentStageStatus) {
          logger.info(`Rule "${action.name}" triggerStatus (${actionTriggerStatus}) does not match current candidate stageStatus (${currentStageStatus}). Skipping.`);
          continue;
        }

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
          const languagesStr = Array.isArray(afterData.workingLanguages) && afterData.workingLanguages.length > 0
            ? afterData.workingLanguages.map((l: Record<string, string>) => `${l.language} (${l.proficiency})`).join(", ")
            : "N/A";

          const mergeValues: Record<string, string> = {
            Vendor_Name:    afterData.contactName   || "Specialist",
            Contact_Name:   afterData.contactName   || "Specialist",
            Company_Name:   afterData.companyName   || "",
            Email:          afterData.email         || "",
            Language:       languagesStr,
            Adjusted_Rate:  afterData.adjustedRate  ? `$${afterData.adjustedRate}` : "Negotiated",
            Confirmed_Rate: afterData.confirmedRate ? `$${afterData.confirmedRate}` : "Negotiated",
            Project_Link:   afterData.stage === 'nda'
              ? `https://mlc-vendor-recruitment.web.app/portal/nda/${vendorId}`
              : `https://mlc-vendor-recruitment.web.app/portal/onboarding/${vendorId}`,
            NDA_Status:     afterData.hasSignedNda  ? "NDA Verified" : "NDA Missing / Required",
            Stage:          afterData.stage         || "",
            Status:         afterData.status        || "",
          };

          // Safe string replacement — avoids RegExp special-char issues with {{ }}
          const replaceMergeTags = (text: string): string => {
            let result = text;
            Object.entries(mergeValues).forEach(([key, val]) => {
              const tag = `{{${key}}}`;
              while (result.includes(tag)) {
                result = result.split(tag).join(val);
              }
            });
            return result;
          };

          emailBody    = replaceMergeTags(emailBody);
          emailSubject = replaceMergeTags(emailSubject);

          // Queue emails based on recipientType
          const sendToVendor = action.recipientType === 'vendor' || action.recipientType === 'both';
          const sendToMlc = action.recipientType === 'mlc' || action.recipientType === 'both';

          if (sendToVendor) {
            const notificationRef = db.collection("notifications").doc();
            await notificationRef.set({
              id: notificationRef.id,
              vendorId,
              vendorName: afterData.contactName || "Specialist",
              vendorEmail: afterData.email || "",
              actionName: action.name || "Workflow Rule Action",
              templateId: action.templateId || "",
              templateName: templateDoc.data()?.name || "Email Template",
              recipientType: action.recipientType || "vendor",
              actualRecipients: [afterData.email],
              isIntercepted: false,
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
              vendorName: afterData.contactName || "Specialist",
              vendorEmail: afterData.email || "",
              actionName: action.name || "Workflow Rule Action",
              templateId: action.templateId || "",
              templateName: templateDoc.data()?.name || "Email Template",
              recipientType: action.recipientType || "both",
              actualRecipients: ["hr@mlconnections.com"],
              isIntercepted: false,
              email: "hr@mlconnections.com",
              subject: `[MLC Copy] ${emailSubject}`,
              body: `--- Copy of mail sent to Candidate: ${afterData.contactName} (${afterData.email}) ---\n\n` + emailBody,
              status: "queued",
              createdAt: new Date().toISOString()
            });
            logger.info(`Queued email to MLC Office: hr@mlconnections.com`);
          }
        }

        // Apply configured candidate field updates (Status, Stage, Stage Status)
        const fieldUpdates: Record<string, any> = {};

        const targetStatus = action.updateStatus || action.updateValue;
        if (targetStatus && targetStatus !== 'none') {
          fieldUpdates.status = targetStatus;
        }

        const targetStage = action.updateStage || action.autoAdvanceStage;
        if (targetStage && targetStage !== 'none') {
          fieldUpdates.stage = targetStage;
          if (!action.updateStageStatus || action.updateStageStatus === 'none') {
            fieldUpdates.stageStatus = 'started';
          }
        }

        if (action.updateStageStatus && action.updateStageStatus !== 'none') {
          fieldUpdates.stageStatus = action.updateStageStatus;
        }

        if (Object.keys(fieldUpdates).length > 0) {
          fieldUpdates.updatedAt = new Date().toISOString();
          await change.after.ref.update(fieldUpdates);
          logger.info(`Successfully updated candidate profile via rule "${action.name}":`, fieldUpdates);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to execute stage trigger workflow actions.", { error: msg });
    }
  }
);

/**
 * Trigger: Automatic mail processor with OAuth2 service account integration.
 * If testing mode is enabled in Settings, intercepts emails and redirects to the selected admin.
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

    let finalRecipient = data.email || data.vendorEmail || "";
    let finalSubject = data.subject;
    let finalBody = data.body;
    let isTestMode = false;
    let testingModeSubtype: 'intercept' | 'send_to_admin' = 'send_to_admin';
    let smtpConfig: any = null;

    try {
      // Query settings/global_config doc for testingMode active state and custom SMTP config
      const configSnap = await db.collection("settings").doc("global_config").get();
      if (configSnap.exists) {
        const config = configSnap.data();
        if (config?.smtp && config.smtp.host && config.smtp.user) {
          smtpConfig = config.smtp;
        }
        if (config?.testingMode?.enabled) {
          isTestMode = true;
          testingModeSubtype = config.testingMode.mode || 'send_to_admin';

          if (testingModeSubtype === 'intercept') {
            // Mode: Intercept emails (log only, do NOT send via SMTP)
            const originalTarget = data.email || data.vendorEmail || "N/A";
            await snap.ref.update({
              status: 'intercepted',
              interceptedAt: new Date().toISOString(),
              isTestMode: true,
              testingModeSubtype: 'intercept',
              dispatchedTo: 'Logged (Not Sent via SMTP)',
              logMessage: `Email intercepted during Testing Mode (Log Only). Intended candidate recipient: ${originalTarget}`
            });

            logger.info(`Mail ID ${event.params.notificationId} INTERCEPTED (log-only mode). Intended candidate: ${originalTarget}. No email dispatched.`);
            return;
          }

          // Mode: Send emails to admin(s)
          const emails = config.testingMode.recipientEmails || [];
          finalRecipient = emails.length > 0 ? emails.join(", ") : "mark@mlconnections.com";
          finalSubject = `[TEST MODE] ${data.subject}`;
          
          // Format HTML with red testing warning banner
          finalBody = `
            <div style="background-color: #ec6757; color: white; padding: 12px; text-align: center; font-weight: bold; font-family: sans-serif; margin-bottom: 20px; font-size: 14px; border-radius: 6px; letter-spacing: 0.5px;">
              ⚠️ SYSTEM EMAIL TESTING MODE ACTIVE (ADMIN DISPATCH)
            </div>
            <div style="background-color: #fef2f2; color: #991b1b; padding: 12px; border: 1px solid #fee2e2; border-radius: 6px; margin-bottom: 20px; font-family: sans-serif; font-size: 12px; line-height: 1.5;">
              <strong>⚠️ TESTING MODE DETAILS:</strong><br/>
              When live, this email would be sent to candidate: <strong>${data.email || data.vendorEmail || ""}</strong>
            </div>
            <div style="font-family: sans-serif; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
${data.body}
            </div>
          `;
        }
      }
    } catch (configErr) {
      logger.error("Failed to query settings/global_config. Defaulting to direct dispatch.", configErr);
    }

    if (!isTestMode) {
      // Wrap regular text in basic layout
      finalBody = `
        <div style="font-family: sans-serif; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
${data.body}
        </div>
      `;
    }

    try {
      const transporter = createNodemailerTransport(smtpConfig);
      const mailOptions = {
        from: smtpConfig?.from || `"MLC Vendor Recruitment" <${DISPLAY_FROM_EMAIL}>`,
        to: finalRecipient,
        subject: finalSubject,
        html: finalBody
      };

      await transporter.sendMail(mailOptions);

      // Update mail delivery status
      await snap.ref.update({
        status: 'sent',
        sentAt: new Date().toISOString(),
        isTestMode,
        testingModeSubtype,
        dispatchedTo: finalRecipient
      });

      logger.info(`Mail ID ${event.params.notificationId} successfully sent via SMTP.`);
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
