import base64
from io import BytesIO
from typing import Optional, Tuple

from PIL import Image, ImageOps, UnidentifiedImageError

GPS_IFD = 0x8825


def _deg(v):
    d, m, s = (float(x) for x in v)
    return d + m / 60 + s / 3600


def read_gps(img) -> Optional[Tuple[float, float]]:
    try:
        gps = img.getexif().get_ifd(GPS_IFD)
        if not gps or 2 not in gps or 4 not in gps:
            return None
        lat, lng = _deg(gps[2]), _deg(gps[4])
        if gps.get(1) == "S":
            lat = -lat
        if gps.get(3) == "W":
            lng = -lng
        return lat, lng
    except Exception:
        return None


def process_photo(raw: bytes):
    """Return (data_url, gps or None). Raises ValueError if the file is not an image."""
    try:
        img = Image.open(BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise ValueError("The file is not a valid image.")
    gps = read_gps(img)
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((1024, 1024))
    buf = BytesIO()
    img.save(buf, "JPEG", quality=70, optimize=True)  # re-encoding also strips EXIF from the stored copy
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(), gps
