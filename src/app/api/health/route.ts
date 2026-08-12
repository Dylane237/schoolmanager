export async function GET() {
  return Response.json({
    ok: true,
    vercel: Boolean(process.env.VERCEL),
    hasJwtSecret: Boolean(process.env.SM_JWT_SECRET),
  })
}
