import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BARCODE_SERVICE_URL = Deno.env.get("BARCODE_SERVICE_URL") ?? "http://localhost:8000";
const INTERNAL_SERVICE_TOKEN = Deno.env.get("INTERNAL_SERVICE_TOKEN") ?? "super-secret-default-token";

serve(async (req) => {
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
    const { unique_code, product_id, shop_logo_url } = await req.json();
    if (!unique_code || !product_id) {
      return new Response(JSON.stringify({ error: "Missing unique_code or product_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Hit the python FastAPI microservice to generate the QR code PNG
    const serviceUrl = `${BARCODE_SERVICE_URL}/generate-qr`;
    const res = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_SERVICE_TOKEN}`
      },
      body: JSON.stringify({ unique_code, shop_logo_url })
    });

    if (!res.ok) {
      throw new Error(`Python barcode service error: ${await res.text()}`);
    }

    const imageBlob = await res.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 2. Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Upload image to the "barcodes" storage bucket
    const bucketName = "barcodes";
    const filePath = `${unique_code}.png`;

    // Ensure bucket exists or handle upload. Standard upload overwrites
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
    }

    // 4. Retrieve public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 5. Write the barcode URL back to the products table
    const { error: updateError } = await supabase
      .from("products")
      .update({ barcode_url: publicUrl })
      .eq("id", product_id);

    if (updateError) {
      throw new Error(`Failed to update products barcode URL in database: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, barcode_url: publicUrl }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
    });

  } catch (err: any) {
    console.error("Asset generation error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
    });
  }
});
