import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: Supabase credentials not found in environment variables.")
        # Return a dummy client or raise an error depending on your needs
        # raise ValueError("Supabase credentials missing.")
    return create_client(SUPABASE_URL or "", SUPABASE_KEY or "")
