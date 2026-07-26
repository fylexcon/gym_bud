"""
GymBud Backend — Supabase Client Utility

Provides two client instances:
- `supabase_client`: Uses the anon key (respects RLS).
- `supabase_admin`: Uses the service_role key (bypasses RLS).
  Used for backend-initiated operations like plan generation.

Import directly:
    from app.utils.supabase_client import supabase_client, supabase_admin
"""

from supabase import create_client, Client
from app.config import settings

# Standard client — respects Row Level Security
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Admin client — bypasses RLS for server-side operations
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
