from pathlib import Path
import tempfile

from pip._internal.cli.main import main


workspace = Path(r"C:\Users\sanwi\OneDrive\Documentos\ChatGPT\APP NACIONAL\work")
temporary = workspace / ".pip-temp"
target = workspace / ".pydeps"
temporary.mkdir(parents=True, exist_ok=True)
target.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(temporary)

raise SystemExit(main(["install", "--no-cache-dir", "--target", str(target), "opencv-python-headless"]))
