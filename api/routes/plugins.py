from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from api.deps import get_current_user
import db
from plugins import loader as plugin_loader
import zipfile
import os
import shutil
from pathlib import Path

router = APIRouter()

class PluginToggle(BaseModel):
    name: str
    enabled: bool

@router.get("")
async def list_plugins(user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        return {"plugins": []}
        
    available = await plugin_loader.loader.scan_plugins()
    enabled_states = await db.get_plugin_states()
    
    for p in available:
        p["enabled"] = enabled_states.get(p["id"], False)
        
    return {"plugins": available}

@router.post("/toggle")
async def toggle_plugin(body: PluginToggle, user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        raise HTTPException(status_code=500, detail="Plugin system not initialized")
        
    await db.set_plugin_enabled(body.name, body.enabled)
    
    if body.enabled:
        success = await plugin_loader.loader.load_plugin(body.name)
        if not success:
            # We still return 200 but with an error flag so the UI can show a warning
            # instead of a generic 500 error
            return {"status": "error", "message": f"Plugin {body.name} was enabled but failed to load. Check bot logs.", "enabled": True}
    else:
        await plugin_loader.loader.unload_plugin(body.name)
        
    return {"status": "ok", "enabled": body.enabled}

@router.post("/reload/{name}")
async def reload_plugin(name: str, user: dict = Depends(get_current_user)):
    if not plugin_loader.loader:
        raise HTTPException(status_code=500, detail="Plugin system not initialized")
        
    success = await plugin_loader.loader.reload_plugin(name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to reload plugin {name}")
        
    return {"status": "ok"}

PLUGINS_DIR = Path("plugins")
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB

@router.post("/upload")
async def upload_plugin(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if not plugin_loader.loader:
        raise HTTPException(status_code=500, detail="Plugin system not initialized")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed.")

    # In newer FastAPI versions, file.size is available.
    # If not, we could use os.fstat(file.file.fileno()).st_size
    file_size = getattr(file, "size", None)
    if file_size is not None and file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE / (1024 * 1024)}MB.")

    # Create plugins directory if it doesn't exist
    PLUGINS_DIR.mkdir(parents=True, exist_ok=True)

    temp_zip_path = PLUGINS_DIR / f"temp_{file.filename}"
    try:
        # Save the uploaded zip file temporarily
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract the zip file
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            file_list = zip_ref.namelist()
            if not file_list:
                 raise HTTPException(status_code=400, detail="Zip file is empty.")

            # Heuristic to determine if we need a wrapper directory
            # If there's more than one top-level item, or if there's any file at the root
            top_level_items = {name.split('/')[0] for name in file_list if name.strip('/')}
            has_files_at_root = any('/' not in name for name in file_list if not name.endswith('/') and name.strip('/'))
            
            needs_wrapper = len(top_level_items) > 1 or has_files_at_root
            
            base_target = PLUGINS_DIR
            if needs_wrapper:
                plugin_id = Path(file.filename).stem
                base_target = PLUGINS_DIR / plugin_id
                base_target.mkdir(parents=True, exist_ok=True)

            plugins_dir_resolved = base_target.resolve()

            for member in zip_ref.infolist():
                filename = member.filename
                if not filename.strip('/'):
                    continue

                extracted_path = (base_target / filename).resolve()
                
                # Zip Slip protection
                if not str(extracted_path).startswith(str(plugins_dir_resolved)):
                    raise HTTPException(status_code=400, detail="Attempted Zip Slip detected!")
                
                if member.is_dir():
                    extracted_path.mkdir(parents=True, exist_ok=True)
                else:
                    extracted_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(extracted_path, "wb") as output_file:
                        with zip_ref.open(member) as input_file:
                            shutil.copyfileobj(input_file, output_file)
        
        # Proactively scan for new plugins
        await plugin_loader.loader.scan_plugins()
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file.")
    except Exception as e:
        # Clean up if something failed and we created a wrapper
        if needs_wrapper and base_target.exists() and base_target != PLUGINS_DIR:
            shutil.rmtree(base_target, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to process plugin: {str(e)}")
    finally:
        # Clean up the temporary zip file
        if temp_zip_path.exists():
            os.remove(temp_zip_path)

    return {"status": "ok", "message": "Plugin uploaded and installed successfully."}
