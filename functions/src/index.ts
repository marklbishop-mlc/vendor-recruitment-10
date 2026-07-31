import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Explicitly target the named database in the admin SDK
const db = getFirestore("mlc-vendor-recruitment-db");

/**
 * Example Cloud Function with explicit service account guidelines.
 * 
 * CRITICAL SECURITY INSTRUCTION:
 * If this function needs access to cross-project logging or specific GCP IAM permissions 
 * (e.g. Logs Viewer, cross-database querying), do NOT remove or omit the serviceAccount parameter.
 */
export const checkRecruitmentStatus = onRequest(
  {
    // Example format:
    // serviceAccount: "vendor-recruitment-sa@in-house-dev-mlc.iam.gserviceaccount.com",
    cors: true,
  },
  async (request, response) => {
    logger.info("Recruitment status check API invoked.", { structuredData: true });
    
    try {
      const snapshot = await db.collection("vendors").limit(5).get();
      const count = snapshot.size;
      
      response.status(200).json({
        success: true,
        message: "MLC Vendor Recruitment Functions are active.",
        database: "mlc-vendor-recruitment-db",
        sampleCount: count
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
