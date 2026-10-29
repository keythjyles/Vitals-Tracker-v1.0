"""
CREATIVE DIRECTION â "GEOLOGIC IMPACT" (V03 REDESIGN)
Concept:
1. Setup ("What did the shy pebble wish for?"): Soft, organic, river-smoothed stone capsule.
   Rendered with a warm granite-slate tint, rounded pill geometry, and delicate drop shadows.
   Appears centered in the lower-third breathing space (Y=1460), keeping Wendell's face, apron,
   and barbecue tongs completely unobstructed.
2. Beat Pause (f56-90): Subtle settle and clean fade-out into the comedic breath.
3. Punchline Lead-in ("That she was a little"): Snappy lower card (Y=1400) setting up scale.
4. The Payoff ("BOULDER"): Heavy, chiseled tectonic slab. Drops in with an authoritative,
   weighted seismic slam (damping overshoot), framed by a golden-amber amber bevel/border 
   matching the sunset rim-light and fire pit embers, complete with an earthen shadow plate.
   Exits at f175, leaving the back 2.6 seconds completely pristine for Wendell's silent deadpan.
"""

import math
from PIL import Image, ImageDraw, ImageFont

# Fonts
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_COND_BOLD = "/opt/codex/runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/share/fonts/truetype/DejaVuSansCondensed-Bold.ttf"
FONT_REGULAR = "/opt/codex/runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/share/fonts/truetype/DejaVuSansCondensed.ttf"

def ease_out_back(t, overshoot=1.70158):
    """Snappy impact curve with slight rebound."""
    t = max(0.0, min(1.0, t)) - 1.0
    return t * t * ((overshoot + 1.0) * t + overshoot) + 1.0

def ease_out_cubic(t):
    t = max(0.0, min(1.0, t))
    return 1.0 - math.pow(1.0 - t, 3)

def draw_pill(draw, box, fill, outline=None, width=1, radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw(frame: int) -> Image.Image:
    # 1080x1920 32-bit RGBA Transparent Canvas
    img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(img)

    # -------------------------------------------------------------
    # PHASE 1: SETUP ("What did the shy pebble wish for?")
    # Active: frames 6 to 82 (Exit well before punchline setup)
    # -------------------------------------------------------------
    if 6 <= frame <= 82:
        # Fade & scale dynamics
        if frame < 18:
            prog = (frame - 6) / 12.0
            alpha = ease_out_cubic(prog)
            scale = 0.85 + 0.15 * ease_out_back(prog, 1.1)
        elif frame > 68:
            prog = (frame - 68) / 14.0
            alpha = max(0.0, 1.0 - prog)
            scale = 1.0 - 0.05 * prog
        else:
            alpha = 1.0
            scale = 1.0

        a_mult = max(0.0, min(1.0, alpha))
        font_main = ImageFont.truetype(FONT_BOLD, 44)
        font_sub = ImageFont.truetype(FONT_COND_BOLD, 36)

        text_line1 = "What did the shy pebble"
        text_line2 = "WISH FOR?"

        # Measure
        b1 = draw_ctx.textbbox((0, 0), text_line1, font=font_main)
        b2 = draw_ctx.textbbox((0, 0), text_line2, font=font_sub)
        w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
        w2, h2 = b2[2] - b2[0], b2[3] - b2[1]

        content_w = max(w1, w2) + 80
        content_h = h1 + h2 + 64
        cx, cy = 540, 1490

        # Badge pill bounds
        bw = content_w * scale
        bh = content_h * scale
        x0, y0 = cx - bw / 2, cy - bh / 2
        x1, y1 = cx + bw / 2, cy + bh / 2

        # Layered polished river-stone pill (Shadow -> Fill -> Highlight Border)
        shadow_box = [x0, y0 + 8 * scale, x1, y1 + 8 * scale]
        draw_pill(draw_ctx, shadow_box, fill=(0, 0, 0, int(90 * a_mult)), radius=28)

        base_box = [x0, y0, x1, y1]
        draw_pill(draw_ctx, base_box, fill=(24, 26, 31, int(215 * a_mult)),
                  outline=(210, 185, 140, int(180 * a_mult)), width=3, radius=28)

        # Subtle pebble core label
        if scale > 0.8:
            # Draw typography
            tx1 = cx - w1 / 2
            ty1 = cy - (h1 + h2 + 16) / 2
            tx2 = cx - w2 / 2
            ty2 = ty1 + h1 + 18

            # Line 1: Off-white river pebble tone
            draw_ctx.text((tx1 + 2, ty1 + 2), text_line1, font=font_main, fill=(0, 0, 0, int(150 * a_mult)))
            draw_ctx.text((tx1, ty1), text_line1, font=font_main, fill=(245, 243, 238, int(255 * a_mult)))

            # Line 2: Warm sunset gold emphasis
            draw_ctx.text((tx2 + 2, ty2 + 2), text_line2, font=font_sub, fill=(0, 0, 0, int(150 * a_mult)))
            draw_ctx.text((tx2, ty2), text_line2, font=font_sub, fill=(255, 196, 82, int(255 * a_mult)))

    # -------------------------------------------------------------
    # PHASE 2: PUNCHLINE ("That she was a little" -> "BOULDER!")
    # Active: frames 91 to 175 (Punchline clears cleanly for deadpan)
    # -------------------------------------------------------------
    elif 91 <= frame <= 175:
        # Exit fade
        exit_alpha = 1.0
        if frame > 158:
            exit_alpha = max(0.0, 1.0 - (frame - 158) / 17.0)

        # 2A: Setup Lead-in: "That she was a little" (f91 - f175)
        lead_alpha = min(1.0, (frame - 91) / 8.0) * exit_alpha
        font_lead = ImageFont.truetype(FONT_REGULAR, 38)
        lead_str = "That she was a little..."
        lb = draw_ctx.textbbox((0, 0), lead_str, font=font_lead)
        lw, lh = lb[2] - lb[0], lb[3] - lb[1]

        lcx, lcy = 540, 1370
        pw, ph = lw + 64, lh + 32
        lx0, ly0 = lcx - pw / 2, lcy - ph / 2
        lx1, ly1 = lcx + pw / 2, lcy + ph / 2

        # ChatGPT implementation of Gemini's specified ribbon and tectonic-slab payoff.
        draw_pill(draw_ctx,[lx0,ly0+5,lx1,ly1+5],(0,0,0,int(90*lead_alpha)),radius=18)
        draw_pill(draw_ctx,[lx0,ly0,lx1,ly1],(24,26,31,int(215*lead_alpha)),radius=18)
        draw_ctx.text((lcx,lcy),lead_str,font=font_lead,anchor="mm",fill=(245,243,238,int(255*lead_alpha)))
        if frame >= 116:
            age=frame-116
            progress=min(1.0,age/10.0)
            settle=ease_out_back(progress,1.1)
            y=1495-170*(1-settle)
            scale=0.94+0.06*settle
            plate=Image.new("RGBA",(1080,1920),(0,0,0,0))
            d=ImageDraw.Draw(plate)
            half_w=425*scale
            half_h=100*scale
            pts=[(540-half_w+24,y-half_h),(540+half_w-32,y-half_h),(540+half_w,y-half_h+30),(540+half_w-9,y+half_h-18),(540+half_w-37,y+half_h),(540-half_w+14,y+half_h),(540-half_w,y+half_h-28),(540-half_w+4,y-half_h+23)]
            shadow=[(x+5,yy+13) for x,yy in pts]
            d.polygon(shadow,fill=(15,11,8,200))
            d.polygon(pts,fill=(40,34,27,250))
            d.line(pts+[pts[0]],fill=(238,178,68,255),width=5)
            d.line([pts[0],pts[1],pts[2]],fill=(255,215,132,255),width=3)
            font_payoff=ImageFont.truetype(FONT_COND_BOLD,round(145*scale))
            d.text((543,y+11),"BOULDER.",font=font_payoff,anchor="mm",fill=(6,8,9,255),stroke_width=2)
            d.text((540,y+3),"BOULDER.",font=font_payoff,anchor="mm",fill=(255,203,102,255),stroke_width=1,stroke_fill=(250,221,164,255))
            plate.putalpha(plate.getchannel("A").point(lambda x:round(x*exit_alpha)))
            img=Image.alpha_composite(img,plate)
    return img

