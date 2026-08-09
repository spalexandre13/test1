import nodemailer, { type Transporter } from "nodemailer";

let cache: Transporter | null = null;

export function getMailer(): Transporter {
  if (cache) return cache;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER / GMAIL_PASS manquants dans .env (utilise un mot de passe d'application Gmail)."
    );
  }
  cache = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return cache;
}

export type EnvoiInput = {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
};

// Traduit les erreurs SMTP courantes en message actionnable.
export function messageErreurSmtp(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/Invalid login|535|BadCredentials/i.test(m)) {
    return "Gmail refuse les identifiants : vérifie GMAIL_USER et surtout que GMAIL_PASS est un mot de passe d'application (16 caractères), pas ton mot de passe habituel.";
  }
  if (/self.signed|certificate/i.test(m)) return `Problème de certificat TLS : ${m}`;
  if (/Connection timeout|Greeting never received|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ESOCKET|socket close/i.test(m)) {
    return `Impossible de joindre smtp.gmail.com sur le port 465/587 (${m}). Vérifie ta connexion, ton pare-feu ou ton antivirus, et que GMAIL_USER / GMAIL_PASS sont bien renseignés dans .env.`;
  }
  if (/Daily user sending quota exceeded|550/i.test(m)) {
    return "Quota d'envoi Gmail atteint (500 mails/jour). Réessaie demain.";
  }
  return m;
}

export async function envoyer(input: EnvoiInput) {
  const transporter = getMailer();
  const from = process.env.SENDER_NAME
    ? `"${process.env.SENDER_NAME}" <${process.env.GMAIL_USER}>`
    : String(process.env.GMAIL_USER);
  try {
    return await transporter.sendMail({
      from,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments
    });
  } catch (e) {
    throw new Error(messageErreurSmtp(e));
  }
}

// Verifie la connexion SMTP sans envoyer de mail.
export async function verifierSmtp(): Promise<{ ok: boolean; message: string }> {
  try {
    await getMailer().verify();
    return { ok: true, message: "Connexion Gmail OK." };
  } catch (e) {
    return { ok: false, message: messageErreurSmtp(e) };
  }
}
