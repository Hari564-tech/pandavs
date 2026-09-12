export const EmailService = {
  async sendTransactionalEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "TeamHub <notifications@updates.rvit.ac.in>";

    if (!apiKey) {
      console.log(`[email] (Dev simulation) To: ${options.to} | Subject: ${options.subject}`);
      return { success: true, simulated: true };
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const res = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return { success: true, data: res };
    } catch (err) {
      console.error("[email] Resend delivery error:", err);
      // Fail safely without throwing to preserve the calling database transaction
      return { success: false, error: err };
    }
  },
};
