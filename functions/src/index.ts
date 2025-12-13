import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch"; // Required for Firebase Functions

admin.initializeApp();

const db = admin.firestore();

// Load environment locally when not in production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

/** ----------------------------
 * 🔑 MISTRAL AI CONFIG
 * -----------------------------*/
const mistralKey = process.env.MISTRAL_API_KEY;
const mistralModel = process.env.MISTRAL_MODEL_ID || "mistral-tiny";

if (!mistralKey) {
  console.error("❌ Missing MISTRAL_API_KEY");
}

/**
 * ----------------------------------------
 * ✅ CALL MISTRAL API
 * ----------------------------------------
 */
async function callMistral(prompt: string) {
  const url = "https://api.mistral.ai/v1/chat/completions";

  const body = {
    model: mistralModel,
    messages: [{ role: "user", content: prompt }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mistralKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mistral error ${resp.status}: ${text}`);
  }

  const data = await resp.json();

  // Defensive extraction
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.content ||
    JSON.stringify(data);

  return content;
}

/* ============================================================
    🔥 CLOUD FUNCTIONS (unchanged logic, compatible with Mistral)
   ============================================================ */

/**
 * 📌 Auto-calculate leaderboard when player score updates
 */
export const calculateLeaderboard = functions.firestore
  .document("quizzes/{quizId}/players/{playerId}")
  .onWrite(async (change, context) => {
    const quizId = context.params.quizId;

    try {
      const playersSnapshot = await db
        .collection(`quizzes/${quizId}/players`)
        .orderBy("score", "desc")
        .get();

      const leaderboard: any[] = [];

      playersSnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          id: doc.id,
          name: data.name,
          score: data.score || 0,
          joinedAt: data.joinedAt,
        });
      });

      await db.doc(`quizzes/${quizId}`).update({
        leaderboard,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`🏆 Leaderboard updated for quiz ${quizId}`);
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  });

/**
 * 📌 When quiz status changes → compute final results
 */
export const onQuizStatusChange = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change, context) => {
    const quizId = context.params.quizId;
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "finished" && after.status === "finished") {
      try {
        const playersSnapshot = await db
          .collection(`quizzes/${quizId}/players`)
          .get();

        const finalScores: any[] = [];

        playersSnapshot.forEach((doc) => {
          const data = doc.data();
          finalScores.push({
            playerId: doc.id,
            name: data.name,
            finalScore: data.score || 0,
            totalAnswers: Object.keys(data.answers || {}).length,
          });
        });

        finalScores.sort((a, b) => b.finalScore - a.finalScore);

        await db.doc(`quizzes/${quizId}`).update({
          finalScores,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`🏁 Final scores calculated for quiz ${quizId}`);
      } catch (error) {
        console.error("Error calculating final scores:", error);
      }
    }
  });

/**
 * 📌 HTTP endpoint to fetch global quiz statistics
 */
export const getQuizStats = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const quizzesSnapshot = await db.collection("quizzes").get();

    let totalQuizzes = 0;
    let activeQuizzes = 0;
    let completedQuizzes = 0;
    let totalPlayers = 0;

    for (const doc of quizzesSnapshot.docs) {
      const data = doc.data();
      totalQuizzes++;

      if (data.status === "active") activeQuizzes++;
      if (data.status === "finished") completedQuizzes++;

      const playersSnapshot = await db
        .collection(`quizzes/${doc.id}/players`)
        .get();

      totalPlayers += playersSnapshot.size;
    }

    res.json({
      totalQuizzes,
      activeQuizzes,
      completedQuizzes,
      totalPlayers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting quiz stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 📌 Cleanup old quizzes automatically
 */
export const cleanupOldQuizzes = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    try {
      const oldQuizzesSnapshot = await db
        .collection("quizzes")
        .where("createdAt", "<", cutoffDate)
        .where("status", "==", "finished")
        .get();

      const batch = db.batch();

      for (const doc of oldQuizzesSnapshot.docs) {
        const playersSnapshot = await db
          .collection(`quizzes/${doc.id}/players`)
          .get();

        playersSnapshot.forEach((playerDoc) => batch.delete(playerDoc.ref));
        batch.delete(doc.ref);
      }

      await batch.commit();
      console.log(`🧹 Cleaned up ${oldQuizzesSnapshot.size} old quizzes`);
    } catch (error) {
      console.error("Error cleaning up old quizzes:", error);
    }
  });
