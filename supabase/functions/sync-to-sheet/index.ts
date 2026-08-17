import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

// Helper to obtain google oauth2 access token
async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to refresh google credentials: ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.access_token;
}

// Convert index to A, B, C... Z, AA column notation
function getColLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp > 0) {
    const modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter || "A";
}

async function updateRow(token: string, spreadsheetId: string, range: string, values: any[][]) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to update google sheet row: ${await res.text()}`);
  }
}

async function clearRow(token: string, spreadsheetId: string, range: string) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to clear google sheet row: ${await res.text()}`);
  }
}

// Core sync engine
async function syncProductToSheet(
  accessToken: string,
  spreadsheetId: string,
  action: string,
  payload: any
) {
  const { id: productId, unique_code, barcode_url, custom_fields } = payload;
  const sheetName = "Products";
  
  // 1. Fetch current sheet state (first 1000 rows, columns A to Z)
  const range = `${sheetName}!A1:Z1000`;
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  
  if (!getRes.ok) {
    throw new Error(`Failed to read sheet data. Ensure a sheet named "Products" exists: ${await getRes.text()}`);
  }
  
  const sheetData = await getRes.json();
  const rows = sheetData.values || [];
  
  // If the sheet is empty, establish the layout and append headers + this row
  if (rows.length === 0) {
    const initialHeaders = ["Product ID", "Unique Code", "Barcode URL"];
    custom_fields.forEach((f: any) => {
      if (!initialHeaders.includes(f.label)) {
        initialHeaders.push(f.label);
      }
    });
    
    await updateRow(accessToken, spreadsheetId, `${sheetName}!A1`, [initialHeaders]);
    
    const rowValues = [productId, unique_code, barcode_url || ""];
    custom_fields.forEach((f: any) => {
      rowValues.push(f.value);
    });
    await updateRow(accessToken, spreadsheetId, `${sheetName}!A2`, [rowValues]);
    return;
  }
  
  const headers = rows[0];
  
  // 2. Compute updated headers if new custom keys are introduced
  const updatedHeaders = [...headers];
  let headersChanged = false;
  custom_fields.forEach((f: any) => {
    if (!updatedHeaders.includes(f.label)) {
      updatedHeaders.push(f.label);
      headersChanged = true;
    }
  });
  
  if (headersChanged) {
    await updateRow(accessToken, spreadsheetId, `${sheetName}!A1`, [updatedHeaders]);
  }
  
  // 3. Match product row
  let productRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === productId) {
      productRowIndex = i + 1; // 1-indexed row representation in Sheets
      break;
    }
  }
  
  // 4. Perform DELETE sync if triggered
  if (action === "DELETE") {
    if (productRowIndex !== -1) {
      const endCol = getColLetter(updatedHeaders.length);
      const clearRange = `${sheetName}!A${productRowIndex}:${endCol}${productRowIndex}`;
      await clearRow(accessToken, spreadsheetId, clearRange);
    }
    return;
  }
  
  // 5. Structure payload values mapping to target columns
  const rowValues = new Array(updatedHeaders.length).fill("");
  rowValues[0] = productId;
  rowValues[1] = unique_code;
  rowValues[2] = barcode_url || "";
  
  custom_fields.forEach((f: any) => {
    const colIdx = updatedHeaders.indexOf(f.label);
    if (colIdx !== -1) {
      rowValues[colIdx] = f.value;
    }
  });
  
  if (productRowIndex !== -1) {
    // Overwrite existing row
    const endCol = getColLetter(updatedHeaders.length);
    await updateRow(
      accessToken,
      spreadsheetId,
      `${sheetName}!A${productRowIndex}:${endCol}${productRowIndex}`,
      [rowValues]
    );
  } else {
    // Append new row at the bottom
    const nextRow = rows.length + 1;
    const endCol = getColLetter(updatedHeaders.length);
    await updateRow(
      accessToken,
      spreadsheetId,
      `${sheetName}!A${nextRow}:${endCol}${nextRow}`,
      [rowValues]
    );
  }
}

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
    const payload = await req.json();
    console.log("Parsing sync queue webhook trigger payload:", payload);

    // Read the queue record that fired this database webhook
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ error: "Missing record data in payload body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: queueId, product_id, shop_id, action_type, payload: syncPayload } = record;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Transition queue state to processing
    await supabase
      .from("product_sync_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", queueId);

    // Fetch Google Sheet reference credentials for target shop
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("google_sheet_id, google_refresh_token, status")
      .eq("id", shop_id)
      .single();

    if (shopError || !shop) {
      throw new Error(`Target shop record could not be parsed: ${shopError?.message}`);
    }

    if (shop.status === "suspended") {
      throw new Error("Target shop account status is suspended");
    }

    // Retrieve active subscription to verify feature authorization
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plans (features)")
      .eq("shop_id", shop_id)
      .eq("status", "active")
      .maybeSingle();

    const planFeatures = (sub?.plans as any)?.features || {};
    if (!planFeatures.sheet_sync) {
      await supabase
        .from("product_sync_queue")
        .update({
          status: "completed",
          error_message: "Skipped: Current active tier does not authorize Sheets integration",
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);

      return new Response(JSON.stringify({ success: true, message: "Sync skipped: Tier features insufficient" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!shop.google_sheet_id || !shop.google_refresh_token) {
      throw new Error("Google Integration settings are incomplete for this shop (Sheet ID / refresh token absent)");
    }

    // Refresh credentials and write changes to google sheets
    const accessToken = await getAccessToken(shop.google_refresh_token);
    await syncProductToSheet(accessToken, shop.google_sheet_id, action_type, syncPayload);

    // Mark sync as completed
    await supabase
      .from("product_sync_queue")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", queueId);

    return new Response(JSON.stringify({ success: true, message: "Google Sheet sync executed successfully" }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Execution failed inside sync-to-sheet Deno engine:", err);
    
    // Attempt fallback update to fail state in queue
    try {
      const payload = await req.clone().json();
      const queueId = payload.record?.id;
      if (queueId) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        await supabase
          .from("product_sync_queue")
          .update({
            status: "failed",
            error_message: err.message || String(err),
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueId);
      }
    } catch (updateErr) {
      console.error("Could not write failure status back to Postgres database:", updateErr);
    }

    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
