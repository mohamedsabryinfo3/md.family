"""Generate MD.Family app icons (192, 512, maskable, favicon) using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

# MD.Family brand colors
TRUST_BLUE = (0, 92, 158)  # #005C9E
DEEP_NAVY = (10, 25, 47)    # #0A192F
WHITE = (255, 255, 255)

def load_font(size):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def make_icon(size, maskable=False, splash=False):
    if splash:
        img = Image.new("RGB", (size, int(size * 1.5)), DEEP_NAVY)
        draw = ImageDraw.Draw(img)
        logo_size = int(size * 0.4)
        cx, cy = size // 2, int(size * 1.5) // 2
        draw.rounded_rectangle(
            [cx - logo_size//2, cy - logo_size//2, cx + logo_size//2, cy + logo_size//2],
            radius=logo_size//4,
            fill=TRUST_BLUE,
        )
        font = load_font(int(logo_size * 0.4))
        text = "MD"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((cx - tw//2, cy - th//2 - bbox[1]), text, fill=WHITE, font=font)
        return img

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if maskable:
        draw.rectangle([0, 0, size, size], fill=TRUST_BLUE)
        margin = int(size * 0.2)
        inner = size - 2 * margin
    else:
        draw.ellipse([0, 0, size-1, size-1], fill=TRUST_BLUE)
        inner = size

    cx, cy = size // 2, size // 2
    s = int(inner * 0.55)
    top = (cx, cy - s // 2)
    left = (cx - s // 2, cy - s // 4)
    right = (cx + s // 2, cy - s // 4)
    bottom_l = (cx - s // 4, cy + s // 2)
    bottom_r = (cx + s // 4, cy + s // 2)
    shield_pts = [top, right, bottom_r, (cx, cy + int(s * 0.7)), bottom_l, left]
    draw.polygon(shield_pts, fill=WHITE)

    font = load_font(int(s * 0.32))
    text = "MD"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - bbox[1] + int(s * 0.05)), text, fill=TRUST_BLUE, font=font)
    return img

# Standard icons
for sz in [192, 512]:
    img = make_icon(sz)
    img.save(f"{OUT}/icon-{sz}.png")
    print(f"Saved icon-{sz}.png")

# Maskable
for sz in [192, 512]:
    img = make_icon(sz, maskable=True)
    img.save(f"{OUT}/icon-maskable-{sz}.png")
    print(f"Saved icon-maskable-{sz}.png")

# Favicon
favicon = make_icon(32)
favicon.save(f"{OUT}/favicon-32.png")
favicon_180 = make_icon(180)
favicon_180.save(f"{OUT}/apple-touch-icon.png")
print("Saved favicon-32.png + apple-touch-icon.png")

# Splash
splash = make_icon(1080, splash=True)
splash.save(f"{OUT}/splash-1080.png")
splash_small = make_icon(540, splash=True)
splash_small.save(f"{OUT}/splash-540.png")
print("Saved splash images")

# favicon.ico
ico_images = [make_icon(s) for s in [16, 32, 48]]
ico_images[0].save("/home/z/my-project/public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("Saved favicon.ico")

print("All icons generated successfully.")
