export function GET(request: Request) {
  const platform = new URL(request.url).searchParams.get("platform");
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300"
  };
  if (platform === "ios") {
    const team = process.env.APPLE_TEAM_ID;
    if (!team || !/^[A-Z0-9]{10}$/.test(team))
      return Response.json(
        { error: "Apple signing team not configured" },
        { status: 503, headers: { ...headers, "Cache-Control": "no-store" } }
      );
    return Response.json(
      {
        applinks: {
          apps: [],
          details: [
            {
              appID: `${team}.com.florenciasoldavini.palla`,
              paths: ["/session"]
            }
          ]
        }
      },
      { headers }
    );
  }
  if (platform === "android") {
    const fingerprints = String(process.env.ANDROID_APP_LINK_FINGERPRINTS ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
    if (!fingerprints.length)
      return Response.json(
        { error: "Android release signing fingerprints not configured" },
        { status: 503, headers: { ...headers, "Cache-Control": "no-store" } }
      );
    return Response.json(
      [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.florenciasoldavini.palla",
            sha256_cert_fingerprints: fingerprints
          }
        }
      ],
      { headers }
    );
  }
  return new Response(null, { status: 404 });
}
