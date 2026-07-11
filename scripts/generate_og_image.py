from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "cbs-migratie-dashboard.png"
FONT_DIR = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def add_glow(image: Image.Image, box: tuple[int, int, int, int], color: tuple[int, int, int], opacity: int) -> None:
    width = box[2] - box[0]
    height = box[3] - box[1]
    mask = ImageOps.invert(Image.radial_gradient("L")).resize((width, height))
    mask = mask.point(lambda value: value * opacity // 255)
    layer = Image.new("RGB", (width, height), color)
    image.paste(layer, box[:2], mask)


image = Image.new("RGB", (1200, 630), "#08090a")
add_glow(image, (-180, -220, 620, 580), (86, 84, 255), 105)
add_glow(image, (650, 40, 1320, 710), (42, 214, 184), 45)
grid = Image.new("RGBA", image.size, (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid)
for x in range(0, 1200, 44):
    grid_draw.line((x, 0, x, 630), fill=(255, 255, 255, 7), width=1)
for y in range(0, 630, 44):
    grid_draw.line((0, y, 1200, y), fill=(255, 255, 255, 7), width=1)
image = Image.alpha_composite(image.convert("RGBA"), grid).convert("RGB")
draw = ImageDraw.Draw(image)

# Brand
logo_box = (72, 54, 124, 106)
draw.rounded_rectangle(logo_box, radius=13, fill="#7170ff", outline="#a7f3d0", width=1)
draw.text((86, 70), "NL", font=font("consola.ttf", 18), fill="white")
draw.text((142, 65), "MigratieMonitor", font=font("seguisb.ttf", 27), fill="#f7f8f8")

# Live chip
chip = (72, 135, 350, 173)
draw.rounded_rectangle(chip, radius=19, fill=(17, 43, 40), outline=(58, 150, 130), width=1)
draw.ellipse((89, 149, 99, 159), fill="#10b981")
draw.text((111, 145), "LIVE DATA UIT CBS STATLINE", font=font("consola.ttf", 14), fill="#9ff5df")

headline = "De laatste\nmigratiecijfers van\nNederland, helder\nin beeld."
draw.multiline_text((72, 194), headline, font=font("seguisb.ttf", 61), fill="#f7f8f8", spacing=-4)
draw.text((74, 515), "Maandtrends · herkomstlanden · migratiemotieven", font=font("segoeui.ttf", 22), fill="#d7dce4")
draw.text((74, 557), "Gebaseerd op CBS-tabellen 85484NED en 84809NED", font=font("consola.ttf", 15), fill="#a5abb5")

# Data card
card = (790, 92, 1128, 538)
draw.rounded_rectangle(card, radius=28, fill=(18, 20, 25), outline=(70, 76, 90), width=2)
draw.text((824, 126), "IN ÉÉN OOGOPSLAG", font=font("consola.ttf", 14), fill="#9a9cff")
draw.text((824, 169), "Actuele cijfers", font=font("seguisb.ttf", 34), fill="#f7f8f8")
draw.text((824, 219), "Rechtstreeks geladen uit de\nCBS Open Data API.", font=font("segoeui.ttf", 19), fill="#d7dce4", spacing=8)

items = [
    ("Immigratie & emigratie", "#828fff"),
    ("Netto migratiesaldo", "#5eead4"),
    ("Top herkomstlanden", "#f0abfc"),
    ("Arbeid, asiel & gezin", "#f59e0b"),
]
for index, (label, color) in enumerate(items):
    y = 314 + index * 47
    draw.ellipse((826, y + 7, 838, y + 19), fill=color)
    draw.text((854, y), label, font=font("segoeui.ttf", 19), fill="#e7e9ed")

# Accent line and URL
draw.rounded_rectangle((790, 562, 1128, 566), radius=2, fill="#7170ff")
draw.text((790, 582), "casperpeters.github.io/cbs-migratie-dashboard", font=font("consola.ttf", 14), fill="#a5abb5")

image.save(OUTPUT, optimize=True, quality=94)
print(f"Wrote {OUTPUT} ({image.width}x{image.height})")
