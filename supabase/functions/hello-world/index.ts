// Primera Edge Function de prueba para el monorepo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Hello from Functions!");

serve(async (req) => {
  const { name } = await req.json();
  const data = {
    message: `Hello ${name}!`,
    timestamp: new Date().toISOString(),
    project: "Intranet Coacharte",
    environment: "development",
  };

  return new Response(
    JSON.stringify(data),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
});
