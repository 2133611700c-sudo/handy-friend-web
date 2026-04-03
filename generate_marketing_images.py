#!/usr/bin/env python3
"""
Generate 5 before/after marketing images for Handy & Friend services
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create output directory
output_dir = '/Users/sergiikuropiatnyk/handy-friend-landing-v6/assets/images/marketing/2026-03-30/'
os.makedirs(output_dir, exist_ok=True)

def create_before_after_image(filename, title, before_color, before_text, after_color, after_text):
    """Create a before/after split image"""
    width, height = 1920, 1080
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Try to use a nice font, fallback to default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
        label_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        text_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

    # Draw BEFORE side (left)
    draw.rectangle([(0, 0), (width//2, height)], fill=before_color)
    draw.text((width//4 - 150, height//2 - 100), "BEFORE", fill='white', font=label_font)
    draw.text((width//4 - 200, height//2 + 50), before_text, fill='white', font=text_font)

    # Draw divider
    draw.line([(width//2, 0), (width//2, height)], fill='gold', width=8)

    # Draw AFTER side (right)
    draw.rectangle([(width//2, 0), (width, height)], fill=after_color)
    draw.text((3*width//4 - 100, height//2 - 100), "AFTER", fill='white', font=label_font)
    draw.text((3*width//4 - 200, height//2 + 50), after_text, fill='white', font=text_font)

    # Draw title at top
    draw.text((width//2 - 400, 50), title, fill='black', font=title_font)

    # Save
    path = os.path.join(output_dir, filename)
    img.save(path)
    print(f"✅ Created: {filename}")
    return path

# Generate all 5 images
print("🎨 Generating marketing images...\n")

create_before_after_image(
    'interior-painting-before-after.png',
    'Interior Painting Transformation',
    '#A0826D',  # Dull beige
    'Dated, tired\nworn walls',
    '#D4E5D4',  # Fresh sage green
    'Modern, fresh\nprofessional finish'
)

create_before_after_image(
    'cabinet-painting-before-after.png',
    'Kitchen Cabinet Refresh',
    '#5C4033',  # Dark tired brown
    'Old, dingy\ncabinets',
    '#F5F5F5',  # Fresh white
    'Gleaming, new\nprofessional spray'
)

create_before_after_image(
    'flooring-before-after.png',
    'Flooring Installation',
    '#8B7765',  # Worn carpet brown
    'Worn, stained\nold carpet',
    '#D2B48C',  # Light laminate tan
    'Pristine, new\nbeautiful floor'
)

create_before_after_image(
    'drywall-repair-before-after.png',
    'Drywall Repair',
    '#C0A080',  # Damaged wall tan
    'Visible hole\nunsightly damage',
    '#E8E8E8',  # Perfect white
    'Seamless repair\ninvisible fix'
)

create_before_after_image(
    'tv-mounting-professional.png',
    'Professional TV Mounting',
    '#2C2C2C',  # Dark room
    'TV on stand\nmessy cables',
    '#1A1A1A',  # Dark elegant room
    'Perfectly mounted\nhidden cables'
)

print("\n" + "="*60)
print("✅ ALL 5 IMAGES GENERATED SUCCESSFULLY")
print("="*60)
print(f"\n📁 Location: {output_dir}")
print("\nFiles created:")
print("  1. interior-painting-before-after.png")
print("  2. cabinet-painting-before-after.png")
print("  3. flooring-before-after.png")
print("  4. drywall-repair-before-after.png")
print("  5. tv-mounting-professional.png")
print("\n✨ Ready for publishing to all channels!")
