type SendResendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  from?: string;
};

function envTrim(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export async function sendResendEmail(params: SendResendEmailParams): Promise<void> {
  const apiKey = envTrim("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const from = (params.from ?? envTrim("EMAIL_FROM")).trim();
  if (!from) throw new Error("EMAIL_FROM is not set.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
    }),
  });

  if (res.ok) return;

  let body = "";
  try {
    body = await res.text();
  } catch {
    // ignore
  }

  // Keep the error string short (no secrets) but actionable in logs.
  const suffix = body ? ` body=${body.slice(0, 500)}` : "";
  throw new Error(`Resend API error: status=${res.status}${suffix}`);
}

