const { getTransporter } = require('./gmail.service')
const AppError = require('../utils/AppError')

const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
  // Instanciado aqui: só executa quando a função é chamada, não na inicialização

  const transporter = await getTransporter()

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#060816;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060816;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.28em;color:#ffffff;">K R O N O S</div>
              <div style="font-size:10px;letter-spacing:0.22em;color:rgba(167,139,250,0.55);text-transform:uppercase;margin-top:4px;">SISTEMA CORPORATIVO DE GESTÃO</div>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(175deg,rgba(13,21,43,0.98) 0%,rgba(7,10,24,1) 100%);border:1px solid rgba(124,92,252,0.20);border-radius:20px;padding:36px;">
              <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px 0;">Redefinição de senha</h2>
              <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.65;margin:0 0 20px 0;">
                Olá${name ? `, <strong style="color:rgba(255,255,255,0.85);">${name}</strong>` : ''}!
                Recebemos uma solicitação para redefinir a senha da sua conta Kronos.
              </p>
              <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.65;margin:0 0 28px 0;">
                Clique no botão abaixo para criar uma nova senha.
                Este link é válido por <strong style="color:#A78BFA;">1 hora</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7C5CFC,#6344e0);border-radius:12px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                      Redefinir senha &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.28);font-size:12px;line-height:1.6;margin:0 0 12px 0;text-align:center;border-top:1px solid rgba(124,92,252,0.12);padding-top:20px;">
                Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
              </p>
              <p style="color:rgba(255,255,255,0.18);font-size:11px;margin:0;text-align:center;word-break:break-all;">
                Ou acesse diretamente: ${resetLink}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="color:rgba(255,255,255,0.13);font-size:11px;margin:0;">© 2025 Kronos. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: 'Redefinição de senha — Kronos',
      html
    })

    console.log('[EmailService] Email enviado para:', to, '| ID:', info?.messageId)
    return info
  } catch (error) {
    console.error('[EmailService] Erro ao enviar email de recuperação:', error)
    throw new AppError(500, 'Erro ao enviar email de recuperação. Tente novamente.')
  }
}

module.exports = { sendPasswordResetEmail }