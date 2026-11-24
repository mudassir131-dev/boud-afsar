import base64
import os
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

OUT_DIR = Path(r"c:\Users\ADMIN\game\assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)
HEAD_CUTOUT_PATH = Path(r"c:\Users\ADMIN\game\tools\head_cutout.png")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
BROWSER = next((p for p in CHROME_CANDIDATES if os.path.exists(p)), None)
if not BROWSER:
    raise RuntimeError("No Chromium browser found for SVG rasterization")


def character_bed_svg(expression: str = "idle") -> str:
    head_b64 = base64.b64encode(HEAD_CUTOUT_PATH.read_bytes()).decode("ascii")
    # Dynamic subtle head pose + comic feedback per state
    if expression == "shoot":
        head_transform = "translate(4, -5) rotate(-7 314 236) scale(1.03)"
        fx = """
          <path d="M 398 156 L 404 170 L 418 176 L 404 182 L 398 196 L 392 182 L 378 176 L 392 170 Z" fill="#FBBF24" stroke="#1E1B24" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 222 178 L 226 187 L 235 191 L 226 195 L 222 204 L 218 195 L 209 191 L 218 187 Z" fill="#38BDF8" stroke="#1E1B24" stroke-width="2.5" stroke-linejoin="round"/>
        """
    elif expression == "miss":
        head_transform = "translate(-4, 2) rotate(-18 314 236)"
        fx = """
          <path d="M 232 198 C 224 212 225 225 234 226 C 243 227 244 214 232 198 Z" fill="#7DD3FC" stroke="#0284C7" stroke-width="3"/>
          <path d="M 392 176 Q 406 168 412 180" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 398 192 Q 412 188 416 198" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-linecap="round"/>
        """
    else:
        head_transform = "rotate(-12 314 236)"
        fx = ""

    photo_head_markup = f"""
      <g transform="{head_transform}">
        <image href="data:image/png;base64,{head_b64}" x="224" y="114" width="176" height="228" preserveAspectRatio="xMidYMid meet" />
      </g>
      {fx}
    """

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 680" width="1000" height="680">
  <defs>
    <!-- Soft floor shadow -->
    <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.22"/>
      <stop offset="65%" stop-color="#1E293B" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#1E293B" stop-opacity="0"/>
    </radialGradient>

    <!-- Rich walnut wood gradients -->
    <linearGradient id="woodMain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7C4D34"/>
      <stop offset="100%" stop-color="#53301E"/>
    </linearGradient>
    <linearGradient id="woodDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5C3623"/>
      <stop offset="100%" stop-color="#3B2013"/>
    </linearGradient>
    <linearGradient id="woodHighlight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9A6446"/>
      <stop offset="100%" stop-color="#75472F"/>
    </linearGradient>

    <!-- Mattress & sheets -->
    <linearGradient id="mattressTop" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="55%" stop-color="#EEF2F6"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="mattressSide" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#CBD5E1"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>

    <!-- Plump cream pillow -->
    <linearGradient id="pillowGrad" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#FFFDF7"/>
      <stop offset="65%" stop-color="#F6EEDD"/>
      <stop offset="100%" stop-color="#E6D7BC"/>
    </linearGradient>

    <!-- Cozy Kashmiri Maroon Kurta/Pheran -->
    <linearGradient id="kurtaGrad" x1="0" y1="0" x2="1" y2="0.8">
      <stop offset="0%" stop-color="#9F2B47"/>
      <stop offset="55%" stop-color="#7F1D37"/>
      <stop offset="100%" stop-color="#5F1227"/>
    </linearGradient>
    <linearGradient id="kurtaSleeve" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#B03351"/>
      <stop offset="100%" stop-color="#751A32"/>
    </linearGradient>

    <!-- Cozy Pajama Pants -->
    <linearGradient id="pajamaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5EDE0"/>
      <stop offset="100%" stop-color="#DDD0BA"/>
    </linearGradient>

    <!-- Folded Teal-Slate Quilt -->
    <linearGradient id="quiltGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2D6A74"/>
      <stop offset="55%" stop-color="#1E4E59"/>
      <stop offset="100%" stop-color="#143741"/>
    </linearGradient>
    <linearGradient id="quiltCuff" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#488E99"/>
      <stop offset="100%" stop-color="#2A656F"/>
    </linearGradient>

    <!-- Skin & Hair -->
    <linearGradient id="skinGrad" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#F2C29B"/>
      <stop offset="70%" stop-color="#E3A87E"/>
      <stop offset="100%" stop-color="#CE8F64"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4B4854"/>
      <stop offset="100%" stop-color="#27242E"/>
    </linearGradient>
    <linearGradient id="beardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6B6D7A"/>
      <stop offset="50%" stop-color="#4A4B56"/>
      <stop offset="100%" stop-color="#353640"/>
    </linearGradient>
    <linearGradient id="lensGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.72"/>
      <stop offset="45%" stop-color="#E0F2FE" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#BAE6FD" stop-opacity="0.12"/>
    </linearGradient>
  </defs>

  <!-- Ground Contact Shadow -->
  <ellipse cx="500" cy="565" rx="415" ry="62" fill="url(#floorShadow)"/>

  <!-- ==================== BED BACK STRUCTURE ==================== -->
  <!-- Back-left headboard leg -->
  <path d="M 108 320 L 136 320 L 136 530 C 136 538 112 538 112 530 Z" fill="url(#woodDark)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>
  <!-- Back-right leg (partially visible under bed) -->
  <path d="M 852 440 L 876 440 L 874 550 C 874 557 852 557 852 550 Z" fill="url(#woodDark)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>

  <!-- Headboard (3/4 angled left side) -->
  <path d="M 110 198 C 110 176 126 164 148 158 L 326 112 C 346 107 362 120 362 140 L 362 325 L 110 385 Z"
        fill="url(#woodMain)" stroke="#24150E" stroke-width="6" stroke-linejoin="round"/>
  <!-- Headboard top bevel highlight -->
  <path d="M 122 182 L 336 126 C 344 124 350 128 352 135 L 352 148 L 122 204 Z"
        fill="url(#woodHighlight)" opacity="0.65"/>
  <!-- Headboard decorative recessed panel -->
  <path d="M 142 214 L 332 164 L 332 292 L 142 340 Z"
        fill="url(#woodDark)" stroke="#361E13" stroke-width="4" stroke-linejoin="round" opacity="0.55"/>
  <!-- Headboard vertical slats -->
  <line x1="205" y1="197" x2="205" y2="324" stroke="#2D180F" stroke-width="4" opacity="0.5"/>
  <line x1="268" y1="181" x2="268" y2="308" stroke="#2D180F" stroke-width="4" opacity="0.5"/>

  <!-- ==================== MATTRESS & BEDSHEET ==================== -->
  <!-- Mattress top surface (parallelogram isometric bed) -->
  <path d="M 134 362 L 366 296 L 882 396 C 896 400 896 418 880 424 L 690 502 C 674 508 652 508 632 503 L 146 392 C 130 388 124 370 134 362 Z"
        fill="url(#mattressTop)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>

  <!-- Subtle mattress sheet fold lines -->
  <path d="M 390 326 Q 530 356 760 400" fill="none" stroke="#CBD5E1" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M 320 398 Q 490 434 655 466" fill="none" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>

  <!-- Mattress front-left thickness skirt -->
  <path d="M 134 385 L 642 501 C 658 505 676 504 690 498 L 884 420 L 884 468 L 690 546 C 674 552 656 552 638 548 L 134 432 Z"
        fill="url(#mattressSide)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>

  <!-- ==================== PLUMP PILLOW ==================== -->
  <path d="M 162 324 C 156 276 205 232 282 224 C 350 217 404 242 406 286 C 408 326 355 362 278 368 C 208 374 166 356 162 324 Z"
        fill="url(#pillowGrad)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>
  <!-- Pillow crease & dimple -->
  <path d="M 188 334 Q 245 352 330 340" fill="none" stroke="#D5C4A6" stroke-width="4" stroke-linecap="round"/>
  <path d="M 205 266 Q 275 246 358 256" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.7"/>

  <!-- ==================== COZY FOLDED QUILT (draped behind/under legs so full body stays clear) ==================== -->
  <path d="M 392 316 C 470 302 640 342 745 376 C 770 385 776 410 755 426 L 680 460 C 650 472 585 468 530 452 L 385 405 C 365 396 368 322 392 316 Z"
        fill="url(#quiltGrad)" stroke="#18272C" stroke-width="5" stroke-linejoin="round"/>
  <!-- Quilt quilted diamond texture hints -->
  <path d="M 455 335 Q 560 362 675 398" fill="none" stroke="#3D828D" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
  <path d="M 432 368 Q 535 396 645 430" fill="none" stroke="#102C34" stroke-width="3" stroke-linecap="round" opacity="0.45"/>

  <!-- ==================== FULL-BODY ILLUSTRATED CHARACTER ==================== -->
  <!-- Subtle contact shadow under character body on bed -->
  <ellipse cx="525" cy="405" rx="235" ry="52" fill="#0F172A" opacity="0.14" transform="rotate(11 525 405)"/>

  <!-- BACK LEG (Right leg slightly bent comfortably) -->
  <g id="back-leg">
    <!-- Pajama trouser leg -->
    <path d="M 556 344 C 608 338 665 344 714 368 C 728 375 734 392 722 404 C 708 416 680 412 648 402 C 606 390 568 386 544 378 Z"
          fill="url(#pajamaGrad)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>
    <!-- Cozy navy sock (back foot) -->
    <path d="M 712 374 C 734 370 762 356 774 362 C 786 368 784 392 764 402 C 742 414 716 408 706 398 Z"
          fill="#263B59" stroke="#1A2538" stroke-width="4.8" stroke-linejoin="round"/>
    <!-- Sock gold stripes & toe cap -->
    <path d="M 726 373 L 722 403" stroke="#EAB308" stroke-width="4" stroke-linecap="round"/>
    <path d="M 736 371 L 732 403" stroke="#F8FAFC" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 762 362 C 774 364 780 378 770 394" fill="none" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- FRONT LEG (Left leg resting forward on mattress, relaxed knee bend) -->
  <g id="front-leg">
    <!-- Pajama trouser leg -->
    <path d="M 526 372 C 578 370 632 384 688 416 C 704 426 706 446 692 456 C 676 468 644 456 602 440 C 562 424 522 418 498 408 Z"
          fill="url(#pajamaGrad)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>
    <!-- Trouser fold crease -->
    <path d="M 562 396 Q 608 408 646 426" fill="none" stroke="#BFA98A" stroke-width="3.2" stroke-linecap="round"/>
    <!-- Cozy navy sock (front foot) -->
    <path d="M 684 422 C 708 418 742 408 756 418 C 768 426 762 452 738 460 C 712 468 688 458 678 446 Z"
          fill="#2E476B" stroke="#1A2538" stroke-width="4.8" stroke-linejoin="round"/>
    <!-- Sock stripes -->
    <path d="M 700 421 L 694 453" stroke="#EAB308" stroke-width="4" stroke-linecap="round"/>
    <path d="M 711 420 L 705 454" stroke="#F8FAFC" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 744 416 C 756 420 758 438 744 452" fill="none" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- TORSO (Cozy Maroon Kashmiri Kurta / Pheran Sleepwear) -->
  <g id="torso">
    <!-- Main torso tunic -->
    <path d="M 358 302 C 392 284 468 294 558 326 C 584 336 592 372 574 398 C 554 426 492 434 422 412 C 372 396 340 368 340 338 C 340 320 346 308 358 302 Z"
          fill="url(#kurtaGrad)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>
    <!-- Kashmiri gold Tilla embroidery border along hem & placket -->
    <path d="M 548 326 C 568 346 566 382 544 404" fill="none" stroke="#F5C451" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 7"/>
    <path d="M 382 324 L 465 344" stroke="#F5C451" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="408" cy="330" r="3.5" fill="#FDE68A"/>
    <circle cx="430" cy="336" r="3.5" fill="#FDE68A"/>
    <circle cx="452" cy="341" r="3.5" fill="#FDE68A"/>
    <!-- Collar trim -->
    <path d="M 366 306 C 384 316 394 334 388 350 C 370 344 358 326 366 306 Z"
          fill="#62142A" stroke="#F5C451" stroke-width="3.2" stroke-linejoin="round"/>
    <!-- Soft fabric shading folds -->
    <path d="M 412 376 Q 468 394 524 386" fill="none" stroke="#4D0E20" stroke-width="3.8" stroke-linecap="round" opacity="0.5"/>
  </g>

  <!-- BACK ARM (Right arm reaching up to center chest ready to aim) -->
  <g id="back-arm">
    <path d="M 405 302 C 434 274 472 268 498 292 C 508 302 504 322 490 326 C 470 332 444 324 416 326 Z"
          fill="url(#kurtaSleeve)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>
    <!-- Gold cuff -->
    <path d="M 484 287 L 496 318" stroke="#F5C451" stroke-width="4.5" stroke-linecap="round"/>
    <!-- Hand -->
    <ellipse cx="508" cy="306" rx="18" ry="15" fill="url(#skinGrad)" stroke="#24150E" stroke-width="4.5"/>
  </g>

  <!-- FRONT ARM (Left arm bent cleanly to hold blaster/aim pivot at center chest) -->
  <g id="front-arm">
    <path d="M 378 342 C 392 384 446 398 494 358 C 506 348 504 328 490 322 C 470 314 440 346 414 336 Z"
          fill="url(#kurtaSleeve)" stroke="#24150E" stroke-width="5" stroke-linejoin="round"/>
    <!-- Gold cuff -->
    <path d="M 476 325 L 492 356" stroke="#F5C451" stroke-width="4.5" stroke-linecap="round"/>
    <!-- Hand (holds pivot around x=505, y=322) -->
    <ellipse cx="506" cy="332" rx="19" ry="16" fill="url(#skinGrad)" stroke="#24150E" stroke-width="4.5"/>
    <!-- Finger detail lines -->
    <path d="M 508 323 Q 518 327 517 334" fill="none" stroke="#9C623D" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M 504 333 Q 514 337 512 343" fill="none" stroke="#9C623D" stroke-width="2.6" stroke-linecap="round"/>
  </g>

  <!-- Cozy blanket drape corner tucked softly over front edge of bed -->
  <path d="M 358 408 C 420 426 484 442 542 456 L 520 512 C 454 496 392 480 338 462 C 330 440 340 416 358 408 Z"
        fill="url(#quiltCuff)" stroke="#18272C" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 366 436 Q 438 456 516 474" fill="none" stroke="#6BB0BA" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>

  <!-- ==================== REAL PHOTO HEAD & CAP (EXACT BODY POSITION) ==================== -->
  <g id="head">
    <!-- Neck connecting seamlessly into maroon kurta collar -->
    <path d="M 332 276 L 372 300 L 352 332 L 318 308 Z" fill="#B87654" stroke="#24150E" stroke-width="4.5" stroke-linejoin="round"/>
    <!-- Soft contact shadow of head resting on pillow -->
    <ellipse cx="302" cy="264" rx="68" ry="52" fill="#1E293B" opacity="0.16" transform="rotate(-12 302 264)"/>

    <!-- Embedded transparent real-photo head cutout -->
    {photo_head_markup}
  </g>

  <!-- ==================== BED FRONT WOODEN FRAME & LEGS ==================== -->
  <!-- Front-left leg -->
  <path d="M 122 412 L 154 418 L 152 572 C 152 582 124 582 124 572 Z" fill="url(#woodMain)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>
  <!-- Front-center/foot leg -->
  <path d="M 652 516 L 686 516 L 684 624 C 684 634 654 634 654 624 Z" fill="url(#woodMain)" stroke="#24150E" stroke-width="5.5" stroke-linejoin="round"/>

  <!-- Side wooden rail (front left) -->
  <path d="M 122 406 L 652 522 C 668 526 686 525 700 518 L 892 436 L 892 478 L 700 562 C 684 568 666 568 648 564 L 122 448 Z"
        fill="url(#woodMain)" stroke="#24150E" stroke-width="6" stroke-linejoin="round"/>
  <!-- Rail bevel highlight -->
  <path d="M 130 416 L 656 530 C 670 533 684 532 696 527 L 884 446" fill="none" stroke="url(#woodHighlight)" stroke-width="5" stroke-linecap="round" opacity="0.65"/>

  <!-- Low Footboard right corner cap -->
  <path d="M 664 510 L 888 418 C 896 414 902 420 902 428 L 902 480 L 678 576 C 668 580 658 574 658 564 L 658 522 C 658 515 660 512 664 510 Z"
        fill="url(#woodDark)" stroke="#24150E" stroke-width="6" stroke-linejoin="round"/>
</svg>"""


def mosquito_svg(wings_up: bool = True) -> str:
    if wings_up:
        left_wing = "M 178 158 C 122 92 42 82 32 126 C 24 162 96 186 174 176 Z"
        right_wing = "M 206 158 C 262 92 342 82 352 126 C 360 162 288 186 210 176 Z"
        wing_vein_l = "M 164 164 Q 108 134 56 128"
        wing_vein_r = "M 220 164 Q 276 134 328 128"
    else:
        left_wing = "M 178 166 C 110 154 34 188 42 224 C 50 256 120 226 176 186 Z"
        right_wing = "M 206 166 C 274 154 350 188 342 224 C 334 256 264 226 208 186 Z"
        wing_vein_l = "M 166 174 Q 112 192 64 214"
        wing_vein_r = "M 218 174 Q 272 192 320 214"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 384" width="384" height="384">
  <defs>
    <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="#DBEAFE" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#93C5FD" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="abdomenGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </linearGradient>
    <linearGradient id="thoraxGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
  </defs>

  <!-- Dangling Jointed Legs (Back) -->
  <g stroke="#1E1B24" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left 3 legs -->
    <path d="M 168 205 L 122 238 L 96 292"/>
    <path d="M 174 218 L 138 264 L 122 320"/>
    <path d="M 180 232 L 156 286 L 146 336"/>
    <!-- Right 3 legs -->
    <path d="M 216 205 L 262 238 L 288 292"/>
    <path d="M 210 218 L 246 264 L 262 320"/>
    <path d="M 204 232 L 228 286 L 238 336"/>
  </g>

  <!-- Translucent Wings -->
  <path d="{left_wing}" fill="url(#wingGrad)" stroke="#64748B" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="{right_wing}" fill="url(#wingGrad)" stroke="#64748B" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="{wing_vein_l}" fill="none" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
  <path d="{wing_vein_r}" fill="none" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>

  <!-- Striped Red-and-Black Abdomen -->
  <ellipse cx="192" cy="236" rx="28" ry="44" fill="url(#abdomenGrad)" stroke="#1E1B24" stroke-width="5.5"/>
  <!-- Abdomen dark stripes -->
  <path d="M 166 222 Q 192 232 218 222" fill="none" stroke="#1E1B24" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M 167 244 Q 192 254 217 244" fill="none" stroke="#1E1B24" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M 174 264 Q 192 272 210 264" fill="none" stroke="#1E1B24" stroke-width="6.5" stroke-linecap="round"/>
  <!-- Gloss highlight on abdomen -->
  <ellipse cx="182" cy="216" rx="6" ry="12" fill="#FCA5A5" opacity="0.55"/>

  <!-- Thorax -->
  <ellipse cx="192" cy="176" rx="30" ry="26" fill="url(#thoraxGrad)" stroke="#1E1B24" stroke-width="5.5"/>

  <!-- Feathery Antennae -->
  <path d="M 178 122 Q 158 84 134 78" fill="none" stroke="#1E1B24" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 206 122 Q 226 84 250 78" fill="none" stroke="#1E1B24" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="134" cy="78" r="5" fill="#EF4444" stroke="#1E1B24" stroke-width="2.5"/>
  <circle cx="250" cy="78" r="5" fill="#EF4444" stroke="#1E1B24" stroke-width="2.5"/>

  <!-- Head -->
  <circle cx="192" cy="144" r="24" fill="#334155" stroke="#1E1B24" stroke-width="5.5"/>

  <!-- Expressive Cheeky Cartoon Eyes -->
  <circle cx="179" cy="140" r="13" fill="#FFFFFF" stroke="#1E1B24" stroke-width="4"/>
  <circle cx="205" cy="140" r="13" fill="#FFFFFF" stroke="#1E1B24" stroke-width="4"/>
  <circle cx="182" cy="142" r="5.5" fill="#1E1B24"/>
  <circle cx="202" cy="142" r="5.5" fill="#1E1B24"/>
  <circle cx="184" cy="139.5" r="2" fill="#FFFFFF"/>
  <circle cx="204" cy="139.5" r="2" fill="#FFFFFF"/>
  <!-- Cheeky mischievous eyebrows -->
  <path d="M 166 125 L 188 131" stroke="#1E1B24" stroke-width="5" stroke-linecap="round"/>
  <path d="M 218 125 L 196 131" stroke="#1E1B24" stroke-width="5" stroke-linecap="round"/>

  <!-- Sharp Pointy Proboscis -->
  <path d="M 187 164 L 192 214 L 197 164 Z" fill="#F43F5E" stroke="#1E1B24" stroke-width="4" stroke-linejoin="round"/>
</svg>"""


def blaster_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="45%" stop-color="#CBD5E1"/>
      <stop offset="100%" stop-color="#64748B"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FB7185"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </radialGradient>
  </defs>

  <!-- Outer soft target ring (matches clean pivot circle from video) -->
  <circle cx="128" cy="142" r="46" fill="#FFFFFF" fill-opacity="0.92" stroke="#1E293B" stroke-width="6"/>

  <!-- Upward sleek dart/zapper barrel -->
  <path d="M 112 126 L 116 42 C 117 32 139 32 140 42 L 144 126 Z"
        fill="url(#metalGrad)" stroke="#1E293B" stroke-width="5.5" stroke-linejoin="round"/>

  <!-- Coral nozzle tip -->
  <rect x="111" y="34" width="34" height="20" rx="8" fill="url(#accentGrad)" stroke="#1E293B" stroke-width="5"/>

  <!-- Energy bands on barrel -->
  <line x1="115" y1="74" x2="141" y2="74" stroke="#0284C7" stroke-width="5" stroke-linecap="round"/>
  <line x1="114" y1="92" x2="142" y2="92" stroke="#0284C7" stroke-width="5" stroke-linecap="round"/>

  <!-- Center core badge -->
  <circle cx="128" cy="142" r="24" fill="url(#coreGlow)" stroke="#1E293B" stroke-width="5"/>
  <circle cx="122" cy="135" r="7" fill="#FFFFFF" opacity="0.65"/>

  <!-- Compact bottom grip -->
  <rect x="116" y="176" width="24" height="32" rx="9" fill="#334155" stroke="#1E293B" stroke-width="5"/>
</svg>"""


def splat_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 384" width="384" height="384">
  <defs>
    <radialGradient id="burstGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#F43F5E"/>
    </radialGradient>
  </defs>
  <!-- Comic starburst -->
  <polygon points="192,28 224,116 314,68 268,154 358,192 268,230 314,316 224,268 192,356 160,268 70,316 116,230 26,192 116,154 70,68 160,116"
           fill="url(#burstGrad)" stroke="#1E1B24" stroke-width="7" stroke-linejoin="round"/>
  <polygon points="192,88 214,144 274,122 240,176 296,192 240,208 274,262 214,240 192,296 170,240 110,262 144,208 88,192 144,176 110,122 170,144"
           fill="#FEF9C3" stroke="#EA580C" stroke-width="4" stroke-linejoin="round"/>
  <!-- Cute comic stars -->
  <circle cx="64" cy="128" r="10" fill="#38BDF8" stroke="#1E1B24" stroke-width="3.5"/>
  <circle cx="324" cy="136" r="12" fill="#A78BFA" stroke="#1E1B24" stroke-width="3.5"/>
  <circle cx="308" cy="264" r="9" fill="#34D399" stroke="#1E1B24" stroke-width="3.5"/>
  <circle cx="76" cy="258" r="11" fill="#FBBF24" stroke="#1E1B24" stroke-width="3.5"/>
</svg>"""


def render_svg_to_webp(svg_content: str, width: int, height: int, out_path: Path, trim: bool = False):
    html = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{
    width: {width}px;
    height: {height}px;
    background: transparent !important;
    overflow: hidden;
  }}
  svg {{
    display: block;
    width: {width}px;
    height: {height}px;
  }}
</style>
</head>
<body>{svg_content}</body>
</html>"""

    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / "render.html"
        png_path = Path(tmp) / "render.png"
        html_path.write_text(html, encoding="utf-8")

        # Add extra height buffer because Chrome headless on Windows subtracts non-client chrome height from viewport
        cmd = [
            BROWSER,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--default-background-color=00000000",
            "--force-device-scale-factor=1",
            f"--window-size={width + 40},{height + 180}",
            f"--screenshot={png_path}",
            html_path.as_uri(),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if not png_path.exists():
            raise RuntimeError(f"Failed rendering {out_path.name}: {res.stderr}")

        img = Image.open(png_path).convert("RGBA")
        # Crop exact SVG canvas box from top-left (0, 0)
        img = img.crop((0, 0, min(width, img.width), min(height, img.height)))
        corner_alpha = img.getpixel((0, 0))[3]
        if trim:
            bbox = img.getbbox()
            if bbox:
                pad = 12
                x0 = max(0, bbox[0] - pad)
                y0 = max(0, bbox[1] - pad)
                x1 = min(img.width, bbox[2] + pad)
                y1 = min(img.height, bbox[3] + pad)
                img = img.crop((x0, y0, x1, y1))

        img.save(out_path, "WEBP", quality=95, method=6)
        print(f"Saved {out_path.name}: {img.size}, alpha(0,0)={corner_alpha}, {out_path.stat().st_size} bytes")


if __name__ == "__main__":
    # Keep identical canvas dimensions for the 3 bed states so sprite swaps have zero jitter!
    render_svg_to_webp(character_bed_svg("idle"), 1000, 680, OUT_DIR / "character-bed-idle.webp")
    render_svg_to_webp(character_bed_svg("shoot"), 1000, 680, OUT_DIR / "character-bed-shoot.webp")
    render_svg_to_webp(character_bed_svg("miss"), 1000, 680, OUT_DIR / "character-bed-miss.webp")
    render_svg_to_webp(mosquito_svg(True), 384, 384, OUT_DIR / "mosquito-up.webp")
    render_svg_to_webp(mosquito_svg(False), 384, 384, OUT_DIR / "mosquito-down.webp")
    render_svg_to_webp(blaster_svg(), 256, 256, OUT_DIR / "blaster.webp")
    render_svg_to_webp(splat_svg(), 384, 384, OUT_DIR / "splat.webp")
    print("All WebP assets generated successfully!")
