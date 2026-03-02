export default async function handler(req, res) {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  if (!code) {
    res.setHeader('Location', '/404');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(302).end();
  }

  // Real user IP + geo from Vercel headers
  const city = req.headers["x-vercel-ip-city"] || "";
  const country = req.headers["x-vercel-ip-country"] || "";
  const region = req.headers["x-vercel-ip-country-region"] || "";
  const xff = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = req.headers["x-real-ip"] || xff || "";

  console.log("📍 Vercel captured real user:", { ip, city, country, region });

  const supabaseUrl = `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click?code=${encodeURIComponent(code)}`;

  try {
    const upstream = await fetch(supabaseUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": req.headers["user-agent"] || "",
        "referer": req.headers["referer"] || "",
        "x-vercel-ip-city": city,
        "x-vercel-ip-country": country,
        "x-vercel-ip-country-region": region,
        "x-real-ip": ip,
        "x-forwarded-for": ip,
      },
    });

    // Valid link → pass through 301/302 redirect directly
    if (upstream.status === 301 || upstream.status === 302) {
      const location = upstream.headers.get("location");
      if (!location) {
        res.setHeader('Location', '/404');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(302).end();
      }
      res.setHeader("Location", location);
      res.setHeader("Cache-Control", "no-store");
      return res.status(302).end();
    }

    // Password required → redirect to password page
    if (upstream.status === 401) {
      res.setHeader('Location', `/password/${code}`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    // Link not found → redirect to 404
    if (upstream.status === 404) {
      res.setHeader('Location', '/404');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    // Link expired or inactive → redirect to error page
    if (upstream.status === 410) {
      res.setHeader('Location', `/link-error?code=${code}&reason=expired`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    // Any other error → redirect to 404
    res.setHeader('Location', '/404');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(302).end();

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.setHeader('Location', '/404');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(302).end();
  }
}