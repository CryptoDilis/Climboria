"""Export existing artwork only; never remove a background or redraw."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

SOURCE = "assets/climb-token-official-cutout.avif"
SOURCE_BLOB = "c7b9e84d539e1159327d073c0bde23c2e6ca97e6"
SIZES = (256, 512)

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def export(root, output):
    raw = (root / SOURCE).read_bytes()
    blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    if blob != SOURCE_BLOB:
        raise ValueError("Official source changed; review required")
    with Image.open(root / SOURCE) as original:
        original.load()
        if original.format != "AVIF" or getattr(original, "n_frames", 1) != 1:
            raise ValueError("Unexpected source format")
        art = original.convert("RGBA")
    alpha = art.getchannel("A")
    lo, hi = alpha.getextrema()
    if lo != 0 or hi == 0 or alpha.getbbox() is None:
        raise ValueError("Source is not a nonempty transparent cutout")
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        raise ValueError("Output directory must be empty")
    info = {
        "status": "DRAFT_EXPORT_NOT_PUBLISHED",
        "source": SOURCE, "sourceGitBlob": blob, "sourceSha256": sha256(raw),
        "sourceDimensions": list(art.size), "sourceAlphaRange": [lo, hi],
        "exports": []
    }
    for size in SIZES:
        scaled = ImageOps.contain(art, (size, size), Image.Resampling.LANCZOS)
        square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        square.paste(scaled, ((size-scaled.width)//2, (size-scaled.height)//2))
        filename = f"climb-logo-{size}.png"
        dest = output / filename
        square.save(dest, "PNG", optimize=True)
        with Image.open(dest) as check:
            check.load()
            if check.mode != "RGBA" or check.size != (size, size) or check.getchannel("A").getextrema()[0] != 0:
                raise ValueError("Invalid transparent PNG output")
        info["exports"].append({"file": filename, "dimensions": [size,size],
            "scaledArtDimensions": list(scaled.size),
            "upscaled": scaled.width > art.width or scaled.height > art.height,
            "bytes": dest.stat().st_size, "sha256": sha256(dest.read_bytes())})
    (output / "logo-export-manifest.json").write_text(json.dumps(info, indent=2)+"\n")
    print(json.dumps(info, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    export(Path(__file__).resolve().parents[2], args.output)
