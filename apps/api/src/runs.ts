import type { Response } from "express";
import { supabaseAdmin } from "./supabase.js";
import { config } from "./config.js";
import { chatCompletion, fillTemplate } from "./azureOpenAI.js";
import { createRunPaymentIntent, stripe } from "./stripe.js";
import type { AuthedRequest } from "./auth.js";
import { FIT_ANALYSIS_SYSTEM, buildFitUserMessage } from "./fitAnalysis.js";

function profileToText(p: Record<string, unknown>): string {
  const parts = [
    p.display_name && `Name: ${p.display_name}`,
    p.headline && `Headline: ${p.headline}`,
    p.summary && `Summary: ${p.summary}`,
    p.skills && `Skills: ${JSON.stringify(p.skills)}`,
    p.experience && `Experience: ${JSON.stringify(p.experience)}`,
    p.education && `Education: ${JSON.stringify(p.education)}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function createRun(req: AuthedRequest, res: Response) {
  const userId = req.profileId!;
  const { roleKey, goal, jobDescriptionId, templateId, userPromptId, jdText: bodyJd, profileText: bodyProfile, fitAnalysis } =
    req.body as {
      roleKey: string;
      goal?: string;
      jobDescriptionId?: string;
      templateId?: string;
      userPromptId?: string;
      jdText?: string;
      profileText?: string;
      fitAnalysis?: boolean;
    };
  if (!roleKey) {
    res.status(400).json({ error: "roleKey required" });
    return;
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  let jdText = bodyJd?.trim() || "";
  if (!jdText && jobDescriptionId) {
    const { data: jd } = await supabaseAdmin
      .from("job_descriptions")
      .select("raw_text, title, company")
      .eq("id", jobDescriptionId)
      .eq("user_id", userId)
      .single();
    if (jd) jdText = `${jd.title ?? "Role"}${jd.company ? ` @ ${jd.company}` : ""}\n\n${jd.raw_text}`;
  }
  if (!jdText) jdText = "(No job description provided.)";

  const profileText = bodyProfile?.trim() || profileToText(profile as Record<string, unknown>);
  const useFit = fitAnalysis ?? Boolean(bodyJd?.trim() || bodyProfile?.trim() || jobDescriptionId);

  let systemPrompt = "";
  let userTemplate = "";
  let userContent = "";

  if (useFit && !userPromptId) {
    systemPrompt = FIT_ANALYSIS_SYSTEM;
    userContent = buildFitUserMessage(jdText, profileText, goal ?? "Full fit analysis for this role");
  } else if (userPromptId) {
    const { data: up } = await supabaseAdmin
      .from("user_prompts")
      .select("*")
      .eq("id", userPromptId)
      .eq("user_id", userId)
      .single();
    if (!up) {
      res.status(404).json({ error: "Custom prompt not found" });
      return;
    }
    systemPrompt = up.system_prompt;
    userTemplate = up.user_prompt_template;
    userContent = fillTemplate(userTemplate, {
      profile: profileText,
      jd: jdText,
      goal: goal ?? "General analysis",
      role: roleKey,
    });
  } else {
    let query = supabaseAdmin.from("prompt_templates").select("*");
    if (templateId) query = query.eq("id", templateId);
    else query = query.eq("role_key", roleKey).eq("is_default", true);
    const { data: tpl } = await query.maybeSingle();
    if (!tpl) {
      res.status(404).json({ error: "Prompt template not found" });
      return;
    }
    systemPrompt = tpl.system_prompt;
    userTemplate = tpl.user_prompt_template;
    userContent = fillTemplate(userTemplate, {
      profile: profileText,
      jd: jdText,
      goal: goal ?? "General analysis",
      role: roleKey,
    });
  }

  const isAdmin = req.isAdmin ?? false;
  const costCents = isAdmin ? 0 : config.stripe.pricePerRunCents;

  const { data: run, error: runErr } = await supabaseAdmin
    .from("ai_runs")
    .insert({
      user_id: userId,
      role_key: roleKey,
      prompt_template_id: templateId ?? null,
      user_prompt_id: userPromptId ?? null,
      job_description_id: jobDescriptionId ?? null,
      profile_id: userId,
      status: isAdmin ? "paid" : "pending_payment",
      is_admin_run: isAdmin,
      cost_cents: costCents,
      input_snapshot: { goal, systemPrompt, userContent, jdPreview: jdText.slice(0, 500), profilePreview: profileText.slice(0, 500) },
    })
    .select()
    .single();

  if (runErr || !run) {
    res.status(500).json({ error: runErr?.message ?? "Failed to create run" });
    return;
  }

  if (!isAdmin) {
    if (!stripe) {
      res.status(503).json({ error: "Payments not configured" });
      return;
    }
    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.userEmail!, metadata: { livlyf_user_id: userId } });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }
    const pi = await createRunPaymentIntent(customerId, req.userEmail!, run.id, costCents);
    await supabaseAdmin
      .from("ai_runs")
      .update({ stripe_payment_intent_id: pi.id })
      .eq("id", run.id);
    res.json({
      runId: run.id,
      status: "pending_payment",
      clientSecret: pi.client_secret,
      amountCents: costCents,
    });
    return;
  }

  await executeRun(run.id, systemPrompt, userContent);
  const { data: completed } = await supabaseAdmin.from("ai_runs").select("*").eq("id", run.id).single();
  res.json({ runId: run.id, status: completed?.status, output: completed?.output_text });
}

export async function executeRun(runId: string, systemPrompt?: string, userContent?: string) {
  const { data: run } = await supabaseAdmin.from("ai_runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");

  const snap = run.input_snapshot as { systemPrompt?: string; userContent?: string };
  const sys = systemPrompt ?? snap.systemPrompt ?? "";
  const user = userContent ?? snap.userContent ?? "";

  await supabaseAdmin.from("ai_runs").update({ status: "running" }).eq("id", runId);

  try {
    const { text, usage } = await chatCompletion([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);
    await supabaseAdmin
      .from("ai_runs")
      .update({
        status: "completed",
        output_text: text,
        model: config.azure.deployment,
        tokens_in: usage?.prompt_tokens ?? null,
        tokens_out: usage?.completion_tokens ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await supabaseAdmin
      .from("ai_runs")
      .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
      .eq("id", runId);
    throw e;
  }
}

export async function confirmRunPayment(req: AuthedRequest, res: Response) {
  const { runId } = req.body as { runId: string };
  const userId = req.profileId!;
  const { data: run } = await supabaseAdmin
    .from("ai_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .single();
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  if (run.is_admin_run || run.status === "completed") {
    res.json({ runId, status: run.status, output: run.output_text });
    return;
  }
  if (!stripe || !run.stripe_payment_intent_id) {
    res.status(400).json({ error: "No payment on file" });
    return;
  }
  const pi = await stripe.paymentIntents.retrieve(run.stripe_payment_intent_id);
  if (pi.status !== "succeeded") {
    res.status(402).json({ error: "Payment not completed", paymentStatus: pi.status });
    return;
  }
  await supabaseAdmin.from("ai_runs").update({ status: "paid" }).eq("id", runId);
  const snap = run.input_snapshot as { systemPrompt?: string; userContent?: string };
  await executeRun(runId, snap.systemPrompt, snap.userContent);
  const { data: completed } = await supabaseAdmin.from("ai_runs").select("*").eq("id", runId).single();
  res.json({ runId, status: completed?.status, output: completed?.output_text });
}

export async function listRuns(req: AuthedRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from("ai_runs")
    .select("id, role_key, status, cost_cents, created_at, completed_at, output_text")
    .eq("user_id", req.profileId!)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ runs: data });
}

export async function deleteRun(req: AuthedRequest, res: Response) {
  const runId = req.params.id;
  if (!runId) {
    res.status(400).json({ error: "Run id required" });
    return;
  }
  const { data: existing } = await supabaseAdmin
    .from("ai_runs")
    .select("id")
    .eq("id", runId)
    .eq("user_id", req.profileId!)
    .maybeSingle();
  if (!existing) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const { error } = await supabaseAdmin.from("ai_runs").delete().eq("id", runId).eq("user_id", req.profileId!);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
}
