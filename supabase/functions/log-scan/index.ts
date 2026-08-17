import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// SHA-256 hashing helper for client IP addresses
async function hashIpAddress(ip: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// User-Agent parser to deduce target client device types
function parseDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet") || (ua.includes("android") && !ua.includes("mobi"))) {
    return "Tablet";
  }
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
    return "Mobile";
  }
  return "Desktop";
}

serve(async (req) => {
  // CORS configurations for browser fetches
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "Missing product_id parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve client IP (fallbacks for various proxy setups like Cloudflare / Vercel)
    const clientIp = req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                     "127.0.0.1";

    const ipHash = await hashIpAddress(clientIp);

    // Resolve Geo Location city from request headers
    const city = req.headers.get("cf-ipcity") ||
                 req.headers.get("x-vercel-ip-city") ||
                 "Unknown";

    // Resolve User-Agent details
    const userAgent = req.headers.get("user-agent") || "";
    const deviceType = parseDeviceType(userAgent);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Anti-abuse Check: Determine if this hashed IP has already scanned this product in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentScans, error: queryError } = await supabase
      .from("scan_logs")
      .select("id")
      .eq("product_id", product_id)
      .eq("ip_hash", ipHash)
      .gt("scanned_at", oneHourAgo);

    if (queryError) {
      throw new Error(`Failed to query database for recent scans: ${queryError.message}`);
    }

    if (recentScans && recentScans.length > 0) {
      // The IP has scanned the product within the last hour. We ignore to prevent scan bloating
      return new Response(JSON.stringify({
        success: true,
        message: "Scan logged (skipped duplicate recording inside rate limit window)",
        new_visit: false
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Transaction 1: Add new Scan Log entry
    const { error: insertError } = await supabase
      .from("scan_logs")
      .insert({
        product_id,
        ip_hash: ipHash,
        city,
        device_type: deviceType
      });

    if (insertError) {
      throw new Error(`Failed to insert scan record logs: ${insertError.message}`);
    }

    // Transaction 2: Increment the product scan counter
    // Rather than fetching and adding, we update via custom update script or increment directly
    const { data: prodData, error: fetchError } = await supabase
      .from("products")
      .select("scan_count")
      .eq("id", product_id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current product scan state: ${fetchError.message}`);
    }

    const currentCount = prodData?.scan_count || 0;
    const { error: updateError } = await supabase
      .from("products")
      .update({ scan_count: currentCount + 1 })
      .eq("id", product_id);

    if (updateError) {
      throw new Error(`Failed to increment product scan count: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Unique product scan logged successfully",
      new_visit: true
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err: any) {
    console.error("Error recorded inside log-scan Deno engine:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
