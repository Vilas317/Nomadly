import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  async sendVerificationEmail(email: string, token: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000";
    if (!apiKey || !from) throw new ServiceUnavailableException("Email delivery is not configured");

    const link = `${webOrigin}/verify-email?token=${encodeURIComponent(token)}`;
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Verify your Nomadly email",
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#203f32"><h1>Welcome to Nomadly</h1><p>Verify your email address to complete your account setup.</p><p><a href="${link}" style="display:inline-block;padding:13px 20px;background:#203f32;color:white;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></div>`,
        }),
      });
    } catch (error) {
      this.logger.error(`Resend request failed (${error instanceof Error ? error.name : "unknown error"})`);
      throw new ServiceUnavailableException("Verification email could not be sent. Please try again.");
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`Resend delivery failed (${response.status}); response length=${body.length}`);
      throw new ServiceUnavailableException("Verification email could not be sent. Please try again.");
    }
  }
}
