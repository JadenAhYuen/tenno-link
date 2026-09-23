"""Build optimized GIFs from actual local-preview browser captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys

frames_dir, output_dir = map(Path, sys.argv[1:3])
output_dir.mkdir(parents=True, exist_ok=True)


def frames(scene):
    return [Image.open(path).convert('RGB') for path in sorted(frames_dir.glob(f'{scene}-*.png'))]


def gif(name, pictures, durations, width=520):
    resized = [picture.resize((width, round(picture.height * width / picture.width)), Image.Resampling.LANCZOS) for picture in pictures]
    palette = [picture.quantize(colors=96, method=Image.Quantize.FASTOCTREE) for picture in resized]
    palette[0].save(output_dir / name, save_all=True, append_images=palette[1:], duration=durations, loop=0, optimize=True, disposal=2)


overview_frames = frames('overview')
overview = overview_frames[0]
chart = frames('chart')
export = frames('export')
gif('overview.gif', overview_frames, [1600, 1700, 1400])
gif('star-chart.gif', chart, [1300, 700, 850, 1100, 1400, 900])
gif('export.gif', export, [1500, 1100, 1500])

font_path = 'C:/Windows/Fonts/segoeuib.ttf' if Path('C:/Windows/Fonts/segoeuib.ttf').exists() else 'DejaVuSans-Bold.ttf'
regular_path = 'C:/Windows/Fonts/segoeui.ttf' if Path('C:/Windows/Fonts/segoeui.ttf').exists() else 'DejaVuSans.ttf'
headline = ImageFont.truetype(font_path, 43)
subhead = ImageFont.truetype(regular_path, 25)
small = ImageFont.truetype(regular_path, 17)
def make_banner(label, subtitle, screen, focus='left'):
    banner = Image.new('RGB', (1100, 360), '#08151d')
    draw = ImageDraw.Draw(banner)
    for y in range(360):
        draw.line((0, y, 1100, y), fill=(8 + y // 55, 21 + y // 22, 29 + y // 30))
    left = 100 if focus == 'right' else 0
    crop = screen.crop((left, 0, screen.width, min(screen.height, 720))).resize((490, 620), Image.Resampling.LANCZOS)
    banner.paste(crop, (680, -80))
    draw.rectangle((0, 0, 1100, 360), outline='#487e88', width=2)
    draw.text((56, 55), 'TENNO LINK', font=small, fill='#8de0da')
    draw.text((56, 123), label, font=headline, fill='#eef7f3')
    draw.text((58, 218), subtitle, font=subhead, fill='#b4cbd0')
    draw.text((58, 308), 'UNOFFICIAL WARFRAME COMPANION  /  LOCAL PREVIEW', font=small, fill='#bb9e6d')
    return banner


banners = [make_banner(label, subtitle, screen) for label, subtitle, screen in [
    ('YOUR ORIGIN SYSTEM', 'Profile progress, missions and tools in one local view', overview),
    ('FIND YOUR NEXT NODE', 'Search missions and show nodes with no completion record', chart[4]),
    ('TAKE YOUR DATA WITH YOU', 'Prepare a private profile package for any AI assistant', export[0]),
]]
gif('tenno-link-banner.gif', banners, [1800, 1800, 1800], width=1100)
mission_banners = [make_banner(label, subtitle, screen, 'right') for label, subtitle, screen in [
    ('SEARCH THE STAR CHART', 'Find mission nodes by name, planet or objective', chart[0]),
    ('SHOW UNPLAYED NODES', 'Focus on missions with no recorded completion', chart[4]),
]]
gif('mission-filter-banner.gif', mission_banners, [1700, 1700], width=1100)
