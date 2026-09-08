#!/usr/bin/env python3
import sys
import os
import argparse
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import qrcode

def generate_report(
    name="Learner",
    level="B1",
    score=55,
    vocab=55,
    grammar=55,
    reading=55,
    listening=55,
    speaking=55,
    cred_id="MRK-2026-0000",
    output_path="sample_report.png"
):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_candidates = [
        os.path.join(script_dir, '../assets/images/report_template.png'),
        '/home/million/Documents/testing/bot/assets/images/report_template.png',
        '/home/million/.gemini/antigravity/brain/fcbcb8d9-7295-41d7-bf4d-e78c2815388f/.user_uploaded/media_1788775433555.png'
    ]
    template_path = next((p for p in template_candidates if os.path.exists(p)), None)

    if not template_path:
        raise FileNotFoundError("Base report template not found!")

    img = Image.open(template_path).convert('RGBA')
    draw = ImageDraw.Draw(img)

    # Color definitions matching the template
    NAVY_DARK = (18, 28, 43)        # #121C2B
    NAVY_MED = (30, 41, 59)         # #1E293B
    GRAY_TEXT = (100, 116, 139)     # #64748B
    GRAY_DARK = (51, 65, 85)        # #334155
    GREEN_LINE = (105, 185, 48)     # #69B930
    GREEN_PILL = (105, 186, 48)     # #69BA30
    WHITE = (255, 255, 255)

    def get_font(size, bold=False):
        path = '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'
        if not os.path.exists(path):
            path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        return ImageFont.truetype(path, size)

    font_main = get_font(34, bold=True)
    font_sub = get_font(14, bold=True)
    font_intro = get_font(14, bold=False)
    font_name = get_font(38, bold=True)
    font_pill = get_font(24, bold=True)
    font_pill_sub = get_font(12, bold=True)
    font_vc = get_font(10, bold=True)
    font_vc_sub = get_font(8, bold=False)

    # 1. Clean Title area (remove "CERTIFICATE" and "OF PROFICIENCY")
    draw.rectangle([248, 182, 776, 268], fill=(251, 251, 251, 255))

    # Main Title: "MARAKI ENGLISH"
    title = "MARAKI ENGLISH"
    spaced_title = " ".join(list(title))
    bbox = font_main.getbbox(spaced_title)
    tw = bbox[2] - bbox[0]
    draw.text(((1024 - tw) // 2, 190), spaced_title, fill=NAVY_DARK, font=font_main)

    # Subtitle: "ASSESSMENT REPORT" flanked by green lines
    sub = "ASSESSMENT  REPORT"
    sbbox = font_sub.getbbox(sub)
    sw = sbbox[2] - sbbox[0]
    sub_x = (1024 - sw) // 2
    sub_y = 246
    draw.text((sub_x, sub_y), sub, fill=NAVY_DARK, font=font_sub)

    line_len = 78
    gap = 16
    line_y = sub_y + (sbbox[3] - sbbox[1]) // 2 + 1
    draw.line([sub_x - gap - line_len, line_y, sub_x - gap, line_y], fill=GREEN_LINE, width=2)
    draw.line([sub_x + sw + gap, line_y, sub_x + sw + gap + line_len, line_y], fill=GREEN_LINE, width=2)

    # 2. Clean "This is to certify that" -> "This assessment report is presented to"
    draw.rectangle([340, 285, 680, 312], fill=(250, 250, 250, 255))
    intro = "This assessment report is presented to"
    ibbox = font_intro.getbbox(intro)
    iw = ibbox[2] - ibbox[0]
    draw.text(((1024 - iw) // 2, 292), intro, fill=GRAY_TEXT, font=font_intro)

    # 3. Recipient Name: Always draw student's actual name dynamically
    clean_name = name.strip() if name else "Learner"
    draw.rectangle([340, 310, 684, 365], fill=(251, 251, 251, 255))
    nbbox = font_name.getbbox(clean_name)
    nw = nbbox[2] - nbbox[0]
    name_x = (1024 - nw) // 2
    name_y = 316
    draw.text((name_x, name_y), clean_name, fill=NAVY_DARK, font=font_name)
    ul_len = max(nw + 60, 260)
    ul_x = (1024 - ul_len) // 2
    ul_y = name_y + (nbbox[3] - nbbox[1]) + 10
    draw.line([ul_x, ul_y, ul_x + ul_len, ul_y], fill=(154, 210, 135), width=2)

    # 4. CEFR Level Badge & Description: Always draw student's actual level dynamically
    clean_level = level.upper().strip() if level else "B1"
    cefr_descriptions = {
        'A1': 'BEGINNER',
        'A2': 'ELEMENTARY',
        'B1': 'INTERMEDIATE',
        'B2': 'UPPER INTERMEDIATE',
        'C1': 'ADVANCED',
        'C2': 'MASTERY'
    }
    level_desc = cefr_descriptions.get(clean_level, 'INTERMEDIATE')
    spaced_desc = "  ".join(level_desc.split())

    draw.rectangle([420, 435, 604, 520], fill=(251, 251, 251, 255))

    pill_w, pill_h = 114, 42
    pill_x = (1024 - pill_w) // 2
    pill_y = 442
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=21, fill=GREEN_PILL)

    pbbox = font_pill.getbbox(clean_level)
    pw = pbbox[2] - pbbox[0]
    ph = pbbox[3] - pbbox[1]
    draw.text((pill_x + (pill_w - pw) // 2, pill_y + (pill_h - ph) // 2 - 2), clean_level, fill=WHITE, font=font_pill)

    ldbbox = font_pill_sub.getbbox(spaced_desc)
    ldw = ldbbox[2] - ldbbox[0]
    draw.text(((1024 - ldw) // 2, pill_y + pill_h + 10), spaced_desc, fill=GRAY_DARK, font=font_pill_sub)

    # 5. Clean "Verified Certificate" / "maraki.ai" -> "Verified Assessment Report" & "Scan QR to verify on Maraki App"
    draw.rectangle([182, 544, 330, 576], fill=(250, 251, 250, 255))
    draw.text((184, 547), "Verified Assessment Report", fill=GRAY_DARK, font=font_vc)
    draw.text((184, 562), "Scan QR to verify on Maraki App", fill=(120, 130, 140), font=font_vc_sub)

    # 6. Scannable QR Code
    if cred_id:
        qr = qrcode.QRCode(version=1, box_size=2, border=1)
        qr.add_data(f"https://maraki-mini-app.vercel.app/verify/{cred_id}")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        qr_img = qr_img.resize((54, 54))
        img.paste(qr_img, (96, 542))

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img.save(output_path, "PNG", quality=95)
    print(f"Assessment report successfully generated at: {output_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='Learner')
    parser.add_argument('--level', default='B1')
    parser.add_argument('--score', type=int, default=55)
    parser.add_argument('--vocab', type=int, default=55)
    parser.add_argument('--grammar', type=int, default=55)
    parser.add_argument('--reading', type=int, default=55)
    parser.add_argument('--listening', type=int, default=55)
    parser.add_argument('--speaking', type=int, default=55)
    parser.add_argument('--cred_id', default='MRK-2026-0000')
    parser.add_argument('--output', default='sample_report.png')
    args = parser.parse_args()

    generate_report(
        name=args.name,
        level=args.level,
        score=args.score,
        vocab=args.vocab,
        grammar=args.grammar,
        reading=args.reading,
        listening=args.listening,
        speaking=args.speaking,
        cred_id=args.cred_id,
        output_path=args.output
    )
