import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, validateConfig } from "./config.js";
import { requireAuth, type AuthedRequest } from "./auth.js";
import { checkUsername, deleteAccount, signIn, signUp } from "./authRoutes.js";
import { confirmRunPayment, createRun, deleteRun, listRuns } from "./runs.js";
import { profileIsAdmin } from "./profileAdmin.js";
import { requireAdmin } from "./adminMiddleware.js";
import { adminUsage, createUser, deleteUserLogin, listUsers, updateUser } from "./adminRoutes.js";
import { stripe } from "./stripe.js";
import { supabaseAdmin } from "./supabase.js";
import { executeRun } from "./runs.js";

const app = express();

app.get("/health", (_req, res) => res.json({ ok: true, service: "livlyf-api" }));

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !config.stripe.webhookSecret) {
      res.status(503).send("Stripe webhook not configured");
      return;
    }
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      res.status(400).send("Missing signature");
      return;
    }
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const runId = pi.metadata?.livlyf_run_id;
        if (runId) {
          const { data: run } = await supabaseAdmin.from("ai_runs").select("*").eq("id", runId).single();
          if (run && run.status === "pending_payment") {
            await supabaseAdmin.from("ai_runs").update({ status: "paid" }).eq("id", runId);
            const snap = run.input_snapshot as { systemPrompt?: string; userContent?: string };
            await executeRun(runId, snap.systemPrompt, snap.userContent);
          }
        }
      }
      res.json({ received: true });
    } catch (e) {
      res.status(400).send(`Webhook Error: ${e instanceof Error ? e.message : "unknown"}`);
    }
  },
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.corsOrigin && origin === config.corsOrigin) return callback(null, true);
      if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV === "production" && /\.onrender\.com$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "3mb" }));

app.post("/api/auth/signup", signUp);
app.post("/api/auth/login", signIn);
app.get("/api/auth/check-username", checkUsername);

app.get("/api/me", requireAuth, async (req: AuthedRequest, res) => {
  const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", req.profileId!).maybeSingle();
  const isAdmin = Boolean(
    data?.is_admin === true ||
      req.isAdmin ||
      (data ? profileIsAdmin(data, req.userEmail) : false),
  );
  res.json({ profile: data, isAdmin });
});

app.delete("/api/account", requireAuth, deleteAccount);

app.get("/api/admin/users", requireAuth, requireAdmin, listUsers);
app.post("/api/admin/users", requireAuth, requireAdmin, createUser);
app.patch("/api/admin/users/:id", requireAuth, requireAdmin, updateUser);
app.delete("/api/admin/users/:id/login", requireAuth, requireAdmin, deleteUserLogin);
app.get("/api/admin/usage", requireAuth, requireAdmin, adminUsage);

app.post("/api/runs", requireAuth, createRun);
app.post("/api/runs/confirm", requireAuth, confirmRunPayment);
app.get("/api/runs", requireAuth, listRuns);
app.delete("/api/runs/:id", requireAuth, deleteRun);

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(apiDir, "../../web/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(webDist, { index: false }));
  app.get(/^(?!\/api\/|\/health$|\/webhooks\/).*/, (_req, res, next) => {
    res.sendFile(path.join(webDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

try {
  validateConfig();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  console.error("API will not start until livlyf/.env is complete. /health would work but routes need Supabase.");
  process.exit(1);
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Livlyf API listening on 0.0.0.0:${config.port}`);
});
