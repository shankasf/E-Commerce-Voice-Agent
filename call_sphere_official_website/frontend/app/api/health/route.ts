export const runtime = "nodejs";

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "callsphere-frontend",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
