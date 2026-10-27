from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


source = Path(r"C:\Users\sanwi\OneDrive\Documentos\ChatGPT\APP NACIONAL\work\video-review")
files = sorted(source.glob("frame-*.jpg"))
thumb_width = 480
thumb_height = 300
label_height = 28
columns = 3
rows = (len(files) + columns - 1) // columns
sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), "white")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=16)

for index, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_width, thumb_height))
    x = (index % columns) * thumb_width
    y = (index // columns) * (thumb_height + label_height)
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + thumb_height + 5), path.stem, fill="#1b2b24", font=font)

sheet.save(source / "contact-sheet.jpg", quality=88)
