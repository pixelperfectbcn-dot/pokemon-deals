export async function sendNotificationEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  return response.json();
}

export function buildDealsEmailHtml(input: {
  newDealsCount: number;
  changedDealsCount: number;
  sourceUsed: string;
  appUrl?: string;
}) {
  const appUrl = input.appUrl ?? "";
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <h2>Pokemon Deals Radar</h2>
      <p>Se han detectado novedades en el refresco automático.</p>
      <ul>
        <li>Nuevos productos: <strong>${input.newDealsCount}</strong></li>
        <li>Cambios de precio: <strong>${input.changedDealsCount}</strong></li>
        <li>Fuente usada: <strong>${input.sourceUsed}</strong></li>
      </ul>
      ${appUrl ? `<p><a href="${appUrl}">Abrir panel</a></p>` : ""}
    </div>
  `;
}
