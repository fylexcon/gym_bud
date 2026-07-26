import uuid
from datetime import date
from fastapi import UploadFile

# CHANGE THIS IMPORT
from app.utils.supabase_client import supabase_admin

async def upload_photo_to_storage(
    bucket: str,
    user_id: str,
    file: UploadFile,
    subfolder: str | None = None,
) -> str:
    """Upload a photo to Supabase Storage and return the public URL path."""
    
    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "jpg"
    unique_name = f"{uuid.uuid4().hex[:8]}.{ext}"
    
    parts = [user_id]
    if subfolder:
        parts.append(subfolder)
    parts.append(unique_name)
    storage_path = "/".join(parts)
    
    content = await file.read()
    
    # USE supabase_admin DIRECTLY
    supabase_admin.storage.from_(bucket).upload(
        path=storage_path,
        file=content,
        file_options={"content-type": file.content_type or "image/jpeg"},
    )
    return storage_path

def get_photo_public_url(bucket: str, path: str) -> str:
    """Get a signed URL for a private storage object."""
    # USE supabase_admin DIRECTLY
    result = supabase_admin.storage.from_(bucket).create_signed_url(
        path=path,
        expires_in=3600,  # 1 hour
    )
    return result["signedURL"]