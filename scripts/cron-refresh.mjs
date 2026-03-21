const refreshUrl = process.env.CRON_REFRESH_URL;
const refreshSecret = process.env.REFRESH_SECRET;

if (!refreshUrl) {
  console.error("CRON_REFRESH_URL no está configurada");
  process.exit(1);
}

async function run() {
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(refreshSecret ? { "x-refresh-secret": refreshSecret } : {})
    },
    body: JSON.stringify({})
  });

  const text = await response.text();
  console.log(text);

  if (!response.ok) {
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
