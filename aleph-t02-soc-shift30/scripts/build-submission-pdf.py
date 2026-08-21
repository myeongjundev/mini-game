from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Iterable

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "aleph-t02-soc-shift30"
IMAGES = ROOT / "실행 이미지"
OUTPUT = ROOT / "output" / "pdf" / "SKT_ALEPH_T02_SOC_SHIFT30_제출_확인자료.pdf"

PAGE = landscape(A4)
W, H = PAGE
M = 38

BG = HexColor("#081018")
PANEL = HexColor("#101A24")
PANEL_2 = HexColor("#152331")
LINE = HexColor("#294052")
TEXT = HexColor("#E8F0F5")
MUTED = HexColor("#9AAEBA")
CYAN = HexColor("#35D7F2")
AMBER = HexColor("#F5B642")
RED = HexColor("#F06565")
GREEN = HexColor("#5DDA8A")
PURPLE = HexColor("#A899FF")


pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))


def split_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for char in paragraph:
            candidate = current + char
            if current and pdfmetrics.stringWidth(candidate, font, size) > max_width:
                lines.append(current.rstrip())
                current = char.lstrip()
            else:
                current = candidate
        if current:
            lines.append(current.rstrip())
    return lines


def draw_text(c: canvas.Canvas, text: str, x: float, y: float, width: float,
              size: float = 10, color=TEXT, font: str = "Malgun",
              leading: float | None = None, max_lines: int | None = None) -> float:
    leading = leading or size * 1.55
    lines = split_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def panel(c: canvas.Canvas, x: float, y: float, w: float, h: float,
          fill=PANEL, stroke=LINE, radius: float = 8) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def page_base(c: canvas.Canvas, number: int, section: str) -> None:
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    c.line(M, H - 30, M + 48, H - 30)
    c.setFont("MalgunBold", 8)
    c.setFillColor(MUTED)
    c.drawString(M + 58, H - 33, f"SOC SHIFT:30  /  {section}")
    c.setFont("Malgun", 8)
    c.drawRightString(W - M, 20, f"SKT ALEPH T02  ·  {number:02d}")


def title(c: canvas.Canvas, text: str, subtitle: str | None = None) -> None:
    c.setFont("MalgunBold", 24)
    c.setFillColor(TEXT)
    c.drawString(M, H - 68, text)
    if subtitle:
        draw_text(c, subtitle, M, H - 88, W - 2 * M, 9, MUTED)


def section_label(c: canvas.Canvas, text: str, x: float, y: float, color=CYAN) -> None:
    c.setFont("MalgunBold", 9)
    c.setFillColor(color)
    c.drawString(x, y, text.upper())


def image_reader(path: Path, crop: tuple[float, float, float, float] | None = None):
    image = Image.open(path).convert("RGB")
    if crop:
        l, t, r, b = crop
        image = image.crop((int(image.width * l), int(image.height * t),
                            int(image.width * r), int(image.height * b)))
    buf = BytesIO()
    image.save(buf, "JPEG", quality=91, optimize=True)
    buf.seek(0)
    return buf, image.width, image.height


def draw_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float,
               crop: tuple[float, float, float, float] | None = None,
               border_color=LINE) -> None:
    buf, iw, ih = image_reader(path, crop)
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.setFillColor(HexColor("#050A0F"))
    c.rect(x, y, w, h, fill=1, stroke=0)
    c.drawImage(ImageReader(buf), dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")
    c.setStrokeColor(border_color)
    c.rect(x, y, w, h, fill=0, stroke=1)


def badge(c: canvas.Canvas, text: str, x: float, y: float, color) -> float:
    width = pdfmetrics.stringWidth(text, "MalgunBold", 8) + 16
    c.setFillColor(color)
    c.roundRect(x, y - 3, width, 18, 6, fill=1, stroke=0)
    c.setFillColor(BG)
    c.setFont("MalgunBold", 8)
    c.drawCentredString(x + width / 2, y + 2, text)
    return width


def bullet_list(c: canvas.Canvas, items: Iterable[str], x: float, y: float, width: float,
                size: float = 9, color=TEXT, gap: float = 7) -> float:
    for item in items:
        c.setFillColor(CYAN)
        c.circle(x + 3, y + 3, 2, fill=1, stroke=0)
        y = draw_text(c, item, x + 14, y, width - 14, size, color,
                      leading=size * 1.45) - gap
    return y


def add_cover(c: canvas.Canvas) -> None:
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_image(c, IMAGES / "E01-rules.png", W * 0.50, 0, W * 0.50, H,
               crop=(0.02, 0.08, 0.98, 0.92), border_color=BG)
    c.setFillColor(HexColor("#0C1722"))
    c.rect(0, 0, W * 0.57, H, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(M, H - 104, 72, 4, fill=1, stroke=0)
    c.setFont("MalgunBold", 12)
    c.setFillColor(AMBER)
    c.drawString(M, H - 136, "SKT ALEPH · 과제 2")
    c.setFont("MalgunBold", 36)
    c.setFillColor(TEXT)
    c.drawString(M, H - 190, "SOC SHIFT:30")
    c.setFont("Malgun", 16)
    c.setFillColor(CYAN)
    c.drawString(M, H - 222, "30초 야간 SOC 판단 미니게임")
    draw_text(c,
              "보안 이벤트를 읽고 ALLOW 또는 BLOCK을 판단한다. 짧은 한 판 안에서 "
              "오탐과 미탐의 비용, 시간 압박, 업무 인수인계를 경험하도록 설계했다.",
              M, H - 272, W * 0.43, 11, TEXT, leading=19)
    badge(c, "현재 상태 · 조건부 제출 가능", M, 124, GREEN)
    draw_text(c, "필수 요구사항 35개 통과 · 사용자 최종 승인 대기",
              M, 96, W * 0.42, 9, MUTED)
    c.setFont("Malgun", 9)
    c.setFillColor(TEXT)
    c.drawString(M, 56, "https://myeongjundev.github.io/mini-game/")
    c.drawString(M, 38, "확인 자료 · 2026-08-21")
    c.showPage()


def add_verification(c: canvas.Canvas) -> None:
    page_base(c, 2, "검증 안내서 · AI 사용 기록")
    title(c, "30초 안에 확인하는 방법", "공개 주소를 연 뒤 최대 3단계로 한 판과 재시작을 확인한다.")
    left_x, right_x = M, W / 2 + 10
    panel(c, left_x, 58, W / 2 - 58, 435)
    section_label(c, "어디로 가나요", left_x + 18, 470)
    draw_text(c, "https://myeongjundev.github.io/mini-game/", left_x + 18, 448,
              W / 2 - 94, 10, CYAN, "MalgunBold")
    section_label(c, "무엇을 하나요", left_x + 18, 414)
    y = bullet_list(c, [
        "1. START SHIFT를 누릅니다.",
        "2. 30초 동안 정상이면 A, 위협이면 D를 누릅니다. 마우스도 됩니다.",
        "3. 결과가 나오면 RETRY SHIFT를 눌러 바로 새 판을 시작합니다.",
    ], left_x + 18, 390, W / 2 - 94, 9)
    section_label(c, "무엇이 보이면 통과인가요", left_x + 18, y - 3, GREEN)
    y = bullet_list(c, [
        "TIME·SCORE·SECURITY·COMBO가 보이고 입력 뒤 값이 한 번 변합니다.",
        "성공은 SHIFT COMPLETE, 실패는 SECURITY LOST로 구분됩니다.",
        "재시작하면 30초·하트 3개·점수 0·콤보 0으로 초기화됩니다.",
    ], left_x + 18, y - 26, W / 2 - 94, 8.5)
    section_label(c, "안 될 때", left_x + 18, y - 3, AMBER)
    bullet_list(c, [
        "강력 새로고침(Ctrl+Shift+R) 후 화면을 한 번 클릭합니다.",
        "탭 복귀 뒤에는 RESUME을 누르고, 계속 안 되면 다른 최신 브라우저를 사용합니다.",
    ], left_x + 18, y - 26, W / 2 - 94, 8.3)

    panel(c, right_x, 58, W / 2 - 48, 435)
    section_label(c, "AI 사용 기록 3줄", right_x + 18, 470, PURPLE)
    ai_lines = [
        ("1", "경보 데이터셋과 문서 초안, 픽셀 아이콘 그리드, 검사 코드, 반복적인 구현과 버그 수정을 AI에게 맡겼다."),
        ("2", "AI가 만든 검사와 브라우저 실측으로 일시정지 중 전화가 받아지던 결함과 좁은 화면에서 조작 안내가 잘리던 문제를 찾아 고쳤고, 그 결과를 게임에 반영했다."),
        ("3", "게임 소재와 ALLOW/BLOCK 두 조작, 경보 제한시간 3초는 직접 플레이해 정했고, 순수 HTML 권고 대신 Vite + React + TypeScript를 선택했으며 실시간 LLM과 백엔드 기능은 범위 밖이라 제외했다."),
    ]
    y = 438
    for num, line in ai_lines:
        c.setFillColor(PURPLE)
        c.circle(right_x + 30, y + 3, 11, fill=1, stroke=0)
        c.setFillColor(BG)
        c.setFont("MalgunBold", 9)
        c.drawCentredString(right_x + 30, y, num)
        y = draw_text(c, line, right_x + 50, y + 4, W / 2 - 98, 8.8, TEXT,
                      leading=14) - 23
    section_label(c, "제출 화면과의 일치", right_x + 18, y, CYAN)
    bullet_list(c, [
        "빈 줄 없이 정확히 3줄, 각 줄 한 문장으로 입력합니다.",
        "PDF와 제출 입력의 세 문장을 완전히 동일하게 유지합니다.",
        "최종 제출 버튼은 사용자 승인 뒤에만 누릅니다.",
    ], right_x + 18, y - 24, W / 2 - 84, 8.5)
    c.showPage()


def add_design(c: canvas.Canvas) -> None:
    page_base(c, 3, "요구사항 해석 · 설계 판단")
    title(c, "복잡한 SOC 업무를 두 개의 선택으로 줄였다",
          "기능 수보다 처음 플레이하는 사람이 빠르게 이해하는 경험을 우선했다.")
    cols = [
        (M, "01  문제", "처음 보는 사람은 보안 용어와 정답 기준을 동시에 이해해야 한다.", AMBER),
        (M + 260, "02  해석", "30초 안에 목적·조작·현재 상태·실패 이유가 모두 화면에 보여야 한다.", CYAN),
        (M + 520, "03  설계", "ALLOW(A) / BLOCK(D) 두 조작, 하트 3개, 즉시 판정과 기록으로 압축했다.", GREEN),
    ]
    for x, head, body, color in cols:
        panel(c, x, 332, 230, 155)
        section_label(c, head, x + 16, 461, color)
        draw_text(c, body, x + 16, 430, 198, 10, TEXT, leading=17)

    panel(c, M, 70, W - 2 * M, 230, fill=PANEL_2)
    section_label(c, "사용자가 직접 내린 핵심 결정", M + 18, 274, PURPLE)
    bullet_list(c, [
        "오탐과 미탐을 서로 다른 실패로 설계: BLOCK도 비용이 있다는 사실을 앰버와 레드의 두 축으로 표현했다.",
        "정보 판독을 위해 본문은 읽기 쉬운 모노스페이스로 두고, 도트 감성은 아이콘·하트·판정 마크에 남겼다.",
        "실시간 LLM, 로그인, 백엔드는 공개 주소 안정성과 6~7시간 범위를 해치므로 제외했다.",
        "순수 HTML 권고 대신 이후 확장과 테스트 가능성을 고려해 Vite + React + TypeScript를 선택했다.",
        "결과 화면을 단순 점수표가 아니라 다음 근무자에게 전달하는 INCIDENT HANDOVER로 바꿨다.",
    ], M + 18, 244, W - 2 * M - 36, 9.3, gap=6)
    c.showPage()


def add_flow(c: canvas.Canvas) -> None:
    page_base(c, 4, "한 판의 흐름")
    title(c, "시작부터 다시 시작까지 한 화면 언어로 이어진다")
    box_w, gap = 176, 12
    specs = [
        ("1  시작", "E01-rules.png", (0.16, 0.25, 0.83, 0.70), "공개 URL과 START SHIFT, 핵심 키가 첫 화면에 보인다."),
        ("2  플레이", "E02-input-before.png", (0.10, 0.15, 0.90, 0.94), "TIME·SCORE·SECURITY·COMBO와 ALLOW/BLOCK을 한눈에 확인한다."),
        ("3  입력 결과", "E02-input-after.png", (0.10, 0.15, 0.90, 0.94), "한 번의 입력 뒤 SCORE 0→100, COMBO ×0→×1로 바뀐다."),
        ("4  재시작", "E05-restart-after.png", (0.10, 0.12, 0.90, 0.94), "새 판은 29.5초·하트 3·점수 0·콤보 0으로 초기화됐다."),
    ]
    for i, (head, fn, crop, cap) in enumerate(specs):
        x = M + i * (box_w + gap)
        section_label(c, head, x, 468, [CYAN, AMBER, GREEN, PURPLE][i])
        draw_image(c, IMAGES / fn, x, 185, box_w, 265, crop)
        draw_text(c, cap, x, 165, box_w, 8.2, TEXT, leading=13)
    c.showPage()


def add_outcomes(c: canvas.Canvas) -> None:
    page_base(c, 5, "성공 · 실패 상태")
    title(c, "같은 결과 구조 안에서 성공과 실패 원인이 갈린다")
    half = (W - 2 * M - 18) / 2
    draw_image(c, IMAGES / "E03-success.png", M, 130, half, 350,
               crop=(0.15, 0.0, 0.85, 0.43), border_color=GREEN)
    draw_image(c, IMAGES / "E04-failure.png", M + half + 18, 130, half, 350,
               crop=(0.12, 0.0, 0.88, 0.66), border_color=RED)
    badge(c, "SUCCESS", M, 98, GREEN)
    draw_text(c, "30.0초 생존, SHIFT COMPLETE와 점수·정확도·인수인계가 표시된다.",
              M + 78, 101, half - 78, 8.5, TEXT)
    badge(c, "FAILURE", M + half + 18, 98, RED)
    draw_text(c, "하트 소진, SECURITY LOST와 오탐·미탐 원인이 색과 텍스트로 구분된다.",
              M + half + 100, 101, half - 82, 8.5, TEXT)
    draw_text(c, "주의: 이 두 캡처는 현재 재도전 버튼 배포 직전 화면이므로 결과 판정 증거로만 사용한다.",
              M, 66, W - 2 * M, 8, AMBER)
    c.showPage()


def add_responsive(c: canvas.Canvas) -> None:
    page_base(c, 6, "PC 숨은 검사")
    title(c, "두 기준 해상도에서 조작 영역을 보존했다",
          "뷰포트는 증거에 보이지만 콘솔 overflow 값은 캡처 밖이므로 별도 실측 기록과 구분한다.")
    half = (W - 2 * M - 18) / 2
    draw_image(c, IMAGES / "E06-overflow-1366.png", M, 205, half, 270)
    draw_image(c, IMAGES / "E07-overflow-1920.png", M + half + 18, 205, half, 270)
    section_label(c, "1366 × 768", M, 185, CYAN)
    draw_text(c, "조작 영역 잘림 없음 · 공개본 별도 실측 overflow 0", M, 165, half, 9, TEXT)
    section_label(c, "1920 × 1080", M + half + 18, 185, CYAN)
    draw_text(c, "레이아웃 비율 유지 · 공개본 별도 실측 overflow 0", M + half + 18, 165, half, 9, TEXT)
    panel(c, M, 60, W - 2 * M, 78)
    bullet_list(c, [
        "연속 입력: event.repeat 가드와 resolvedRef 잠금 자동 검사 통과; 사람의 20회 연타 확인은 별도 권장 항목이다.",
        "포커스 이탈: 자동 일시정지 후 자동 재개하지 않으며 RESUME으로 이어진다.",
    ], M + 16, 112, W - 2 * M - 32, 8.5, gap=3)
    c.showPage()


def add_stability(c: canvas.Canvas) -> None:
    page_base(c, 7, "콘솔 · 네트워크 · 장시간 실행")
    title(c, "10분 48초 연속 실행 뒤에도 콘솔 오류는 0건이었다")
    draw_image(c, IMAGES / "E12-console-play.png", M, 270, 240, 205)
    draw_image(c, IMAGES / "E12-console-restart.png", M + 250, 270, 240, 205)
    draw_image(c, IMAGES / "E13-network.png", M + 500, 270, 265, 205)
    caps = [
        (M, "플레이 종료", "Console 비어 있음 · No Issues"),
        (M + 250, "재시작 뒤", "29.0초·초기값 · Console 비어 있음"),
        (M + 500, "네트워크", "5건 모두 myeongjundev.github.io · 200"),
    ]
    for x, head, body in caps:
        section_label(c, head, x, 248, GREEN)
        draw_text(c, body, x, 230, 240, 8, TEXT)
    panel(c, M, 65, W - 2 * M, 130, fill=PANEL_2, stroke=GREEN)
    badge(c, "통과", M + 16, 164, GREEN)
    draw_text(c,
              "공개본을 648초 동안 실행하며 128판을 다시 시작하고 2,517회 입력을 처리했다. "
              "종료 시점 브라우저 콘솔 로그와 빨간 오류는 모두 0건이었다.",
              M + 108, 169, W - 2 * M - 126, 9, TEXT, leading=15)
    draw_text(c,
              "증거: E14-runtime-10min-result.json · E14-runtime-10min-console-zero.png · 실행 시각 16:37:55~16:48:44 KST",
              M + 16, 110, W - 2 * M - 32, 9, CYAN, leading=15)
    c.showPage()


def add_storage_effects(c: canvas.Canvas) -> None:
    page_base(c, 8, "저장 복구 · 선택권")
    title(c, "고장 나도 시작하고, 효과는 사용자가 줄일 수 있다")
    third = (W - 2 * M - 24) / 3
    draw_image(c, IMAGES / "E11-storage-broken-json.png", M, 245, third, 235,
               crop=(0, 0.05, 1, 0.95))
    draw_image(c, IMAGES / "E08-mute-after.png", M + third + 12, 245, third, 235,
               crop=(0.04, 0.25, 0.96, 0.82))
    draw_image(c, IMAGES / "E09-motion-after.png", M + (third + 12) * 2, 245, third, 235,
               crop=(0.05, 0.07, 0.95, 0.84))
    labels = [
        (M, "손상 저장값 복구", "잘못된 JSON 뒤에도 기본 설정으로 로비가 열리고 콘솔 오류가 없다."),
        (M + third + 12, "SOUND // ON", "음소거 해제가 즉시 반영되고 브라우저 탭의 재생 아이콘도 확인된다."),
        (M + (third + 12) * 2, "REDUCE MOTION // ON", "큰 움직임을 줄이되 판정 정보와 핵심 규칙은 유지한다."),
    ]
    for x, head, body in labels:
        section_label(c, head, x, 222, CYAN)
        draw_text(c, body, x, 202, third, 8.2, TEXT, leading=13)
    panel(c, M, 62, W - 2 * M, 96)
    bullet_list(c, [
        "새 판에서 시간·라이프·점수·콤보는 초기화하고 최고 점수·음소거·움직임 설정만 보존한다.",
        "없음·빈 값·잘못된 JSON·누락 필드·범위 밖 숫자·버전 불일치에서도 기본값으로 실행된다.",
    ], M + 16, 132, W - 2 * M - 32, 8.5, gap=3)
    c.showPage()


def add_difficulty(c: canvas.Canvas) -> None:
    page_base(c, 9, "난이도 판단")
    title(c, "20판의 기록으로 최종값 3000ms를 선택했다",
          "두 묶음 사이에서 eventIntervalMs 하나만 바꾸고 모든 판을 기록했다.")
    panel(c, M, 298, 230, 170)
    section_label(c, "A · 최종값 3000ms", M + 16, 442, GREEN)
    draw_text(c, "생존 중앙값 13.75초", M + 16, 412, 198, 13, GREEN, "MalgunBold")
    draw_text(c, "점수 중앙값 3,950 · 정확도 중앙값 83.75% · 범위 6.6~26.4초",
              M + 16, 378, 198, 9, TEXT, leading=15)

    panel(c, M + 248, 298, 250, 170)
    section_label(c, "B · 비교값 2000ms", M + 264, 442, AMBER)
    draw_text(c, "생존 중앙값 7.05초", M + 264, 412, 218, 13, AMBER, "MalgunBold")
    draw_text(c, "점수 중앙값 2,300 · 정확도 중앙값 72.5% · 범위 2.6~15.6초",
              M + 264, 378, 218, 9, TEXT, leading=15)

    panel(c, M + 516, 298, W - M - (M + 516), 170, stroke=RED)
    section_label(c, "필수 기록 상태", M + 532, 442, CYAN)
    draw_text(c, "3000ms: 10 / 10\n2000ms: 10 / 10", M + 532, 412, 190, 14, CYAN, "MalgunBold", leading=23)
    draw_text(c, "두 조건 모두 성공 0회 · 혼합 실패 10회", M + 532, 350, 190, 8.5, MUTED)

    panel(c, M, 72, W - 2 * M, 195, fill=PANEL_2)
    badge(c, "통과", M + 18, 235, GREEN)
    draw_text(c,
              "3000ms에서 생존 중앙값이 6.70초, 정확도 중앙값이 11.25%p, 점수 중앙값이 1,650 높았다. "
              "생존 범위 상단도 15.6초에서 26.4초로 늘어 두 후보 중 3000ms를 최종값으로 유지한다.",
              M + 102, 240, W - 2 * M - 120, 9.2, TEXT, leading=16)
    bullet_list(c, [
        "두 조건 모두 성공률 0%로 목표 대역 50~80%에는 도달하지 못했다.",
        "두 조건 모두 혼합 실패가 10회 반복됐으며 이 한계를 숨기지 않는다.",
        "실험에서 허용한 변경값은 eventIntervalMs 하나뿐이며 다른 규칙은 고정했다.",
    ], M + 18, 185, W - 2 * M - 36, 8.7, gap=5)
    c.showPage()


def draw_matrix(c: canvas.Canvas, page_no: int, title_text: str,
                rows: list[tuple[str, str, str]]) -> None:
    page_base(c, page_no, "완주 체크리스트")
    title(c, title_text, "판정은 통과 · 미통과 · 증거 부족 · 해당 없음 네 가지만 사용한다.")
    x0, y_top = M, H - 112
    widths = [385, 90, W - 2 * M - 475]
    headers = ["요구사항", "판정", "관찰한 증거"]
    c.setFillColor(PANEL_2)
    c.rect(x0, y_top - 25, sum(widths), 25, fill=1, stroke=0)
    x = x0
    for head, width in zip(headers, widths):
        c.setFont("MalgunBold", 8)
        c.setFillColor(CYAN)
        c.drawString(x + 7, y_top - 17, head)
        x += width
    y = y_top - 25
    row_h = min(24, (y - 42) / len(rows))
    for idx, (req, verdict, evidence) in enumerate(rows):
        if idx % 2 == 0:
            c.setFillColor(PANEL)
            c.rect(x0, y - row_h, sum(widths), row_h, fill=1, stroke=0)
        x = x0
        vals = [(req, TEXT), (verdict, {"통과": GREEN, "미통과": RED, "증거 부족": AMBER}.get(verdict, MUTED)), (evidence, MUTED)]
        for (val, color), width in zip(vals, widths):
            c.setFont("MalgunBold" if width == 90 else "Malgun", 7.1)
            c.setFillColor(color)
            c.drawString(x + 7, y - row_h + 7, val[:105])
            x += width
        c.setStrokeColor(LINE)
        c.line(x0, y - row_h, x0 + sum(widths), y - row_h)
        y -= row_h
    c.showPage()


def add_matrices(c: canvas.Canvas) -> None:
    rows_1 = [
        ("A1 공개 주소에서 시작·종료·재시작", "통과", "E01~E05 · 실제 플레이"),
        ("A2 30초 안에 성공 또는 실패 도달", "통과", "타이머 실측 · 무입력 9초 실패"),
        ("A3 조작·진행·성공·실패 구분", "통과", "HUD · SHIFT COMPLETE / SECURITY LOST"),
        ("A4 재시작 시 이전 판 초기화", "통과", "E05 · 재시작 7판 실측"),
        ("A5 규칙 문서와 현재 동작 일치", "통과", "GAME_SPEC 13~15절 대조"),
        ("A6 시작·플레이·결과·재시작 캡처", "통과", "E01~E05 6장"),
        ("B1 1366×768 가로 넘침 0", "통과", "E06 + 공개본 별도 실측 0"),
        ("B2 1920×1080 가로 넘침 0", "통과", "E07 + 공개본 별도 실측 0"),
        ("B3 조작 영역 잘림 없음", "통과", "320~1920 아홉 폭 실측"),
        ("B4 연속 입력·누르고 있기·반대 키 중복 없음", "통과", "event.repeat · resolvedRef 자동 검사"),
        ("B5 키보드와 마우스 핵심 조작", "통과", "버튼·키 입력 구현 · 모바일 완주"),
        ("C1 포커스 이탈 중 시간 정지", "통과", "탭 전환 자동 일시정지 실측"),
        ("C2 일시정지·재개 중복 타이머 없음", "통과", "재시작 7판 비율 1.00 · 검사"),
        ("C3 일시정지 중 상태 불변", "통과", "전화·공지 결함 수정 후 손 확인"),
        ("C4 10분 연속 실행", "통과", "공개본 648초 · 128판 · 오류 0건"),
        ("C5 콘솔 오류 0건 - 로드", "통과", "E11 · E12 · E13"),
        ("C6 콘솔 오류 0건 - 플레이·재시작", "통과", "E12 두 장 · No Issues"),
        ("D1 변경 전 10회 + 변경 후 10회", "통과", "3000ms 10판 · 2000ms 10판 실제 기록"),
    ]
    rows_2 = [
        ("E1 새 게임에서 현재 판 값 초기화", "통과", "자동 검사 · E05"),
        ("E2 최고 점수·접근성 설정 유지", "통과", "storage.ts · 자동 검사"),
        ("E3 진행 상태는 보존하지 않음", "통과", "저장 대상 코드 대조"),
        ("E4 손상값에서 기본값 실행", "통과", "E11 · 잘못된 JSON 등 공개본 실측"),
        ("E5 손상 복구 시 콘솔 오류 0건", "통과", "E11 Console No Issues"),
        ("F1 음소거 즉시 반영", "통과", "E08 전후 · 탭 재생 아이콘"),
        ("F2 움직임 줄이기 즉시 반영", "통과", "E09 · data-reduce-motion 실측"),
        ("F3 효과 감소 뒤에도 핵심 판정 유지", "통과", "흔들림을 테두리 플래시로 대체"),
        ("F4 효과 작동 화면 증거", "통과", "E08 전후 · E09"),
        ("G1 배포 파일 개인정보·비밀값 0건", "통과", "공개 번들 검색"),
        ("G2 토큰·API 키 0건", "통과", "탐지 2건은 React 내부 문자열"),
        ("G3 외부 도메인 요청 0건", "통과", "E13 · 5건 동일 도메인"),
        ("G4 공개 페이지·자산·새로고침 정상", "통과", "index·음원 200 · E13"),
        ("G5 캡처 개인정보 0건", "통과", "17장 육안 대조 · 시크릿 모드"),
        ("H1 검증 안내서 3단계 이내", "통과", "notes/06 · PDF 2쪽"),
        ("H2 AI 사용 기록 정확히 3줄", "통과", "notes/06 · PDF 2쪽"),
        ("H3 증거 캡처·기록표 비공개 보관", "통과", "실행 이미지/ · evidence/ gitignore"),
    ]
    draw_matrix(c, 10, "요구사항 매트릭스 A-D", rows_1)
    draw_matrix(c, 11, "요구사항 매트릭스 E-H", rows_2)


def add_final(c: canvas.Canvas) -> None:
    page_base(c, 12, "최종 교차 확인")
    title(c, "필수 조건 통과 · 사용자 승인 뒤 제출할 수 있다")
    panel(c, M, 318, 235, 156, stroke=GREEN)
    badge(c, "조건부 제출 가능", M + 16, 442, GREEN)
    draw_text(c, "요구사항 35개 전부 통과", M + 16, 406, 203, 11, GREEN, "MalgunBold")
    draw_text(c, "A/B 20판 · 10분 실행 완료", M + 16, 374, 203, 10, CYAN, "MalgunBold")
    draw_text(c, "최종 제출 버튼은 사용자 승인 뒤에만 누른다.", M + 16, 344, 203, 8.5, MUTED)

    panel(c, M + 253, 318, W - 2 * M - 253, 156)
    section_label(c, "사용자가 해야 할 일", M + 270, 448, CYAN)
    bullet_list(c, [
        "공개 주소에서 게임 시작·판정·재시작이 정상인지 마지막으로 확인한다.",
        "제출 화면에서 네 체크박스와 확인 파일을 확인한 뒤 명시적으로 제출을 승인한다.",
    ], M + 270, 420, W - 2 * M - 287, 8.5, gap=4)

    panel(c, M, 82, W - 2 * M, 205, fill=PANEL_2)
    section_label(c, "제출 화면 입력값", M + 18, 260, PURPLE)
    draw_text(c, "결과물 URL", M + 18, 231, 100, 8, MUTED, "MalgunBold")
    draw_text(c, "https://myeongjundev.github.io/mini-game/", M + 122, 231, 390, 9, CYAN, "MalgunBold")
    draw_text(c, "확인할 파일", M + 18, 199, 100, 8, MUTED, "MalgunBold")
    draw_text(c, OUTPUT.name, M + 122, 199, W - 2 * M - 140, 8, TEXT)
    section_label(c, "체크박스 판단", M + 18, 160, AMBER)
    checks = [
        ("결과물 URL 또는 실행 결과", "체크 가능", GREEN),
        ("실행 캡처", "체크 가능", GREEN),
        ("AI 사용 기록", "체크 가능", GREEN),
        ("스스로 점검표", "체크 가능", GREEN),
    ]
    x = M + 18
    for label, state, color in checks:
        w = 174
        c.setFillColor(BG)
        c.roundRect(x, 104, w, 38, 5, fill=1, stroke=0)
        draw_text(c, label, x + 8, 130, w - 16, 7.2, MUTED, "MalgunBold", leading=10)
        draw_text(c, state, x + 8, 115, w - 16, 7.4, color, "MalgunBold")
        x += w + 8
    c.showPage()


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=PAGE, pageCompression=1)
    c.setTitle("SKT ALEPH T02 - SOC SHIFT:30 제출 확인자료")
    c.setAuthor("SKT ALEPH T02")
    c.setSubject("SOC SHIFT:30 구현·검증·제출 준비 기록")
    add_cover(c)
    add_verification(c)
    add_design(c)
    add_flow(c)
    add_outcomes(c)
    add_responsive(c)
    add_stability(c)
    add_storage_effects(c)
    add_difficulty(c)
    add_matrices(c)
    add_final(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
