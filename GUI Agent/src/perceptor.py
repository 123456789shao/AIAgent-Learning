from __future__ import annotations

from datetime import datetime
from typing import Any

from PIL import Image
from mss import mss

try:
    from paddleocr import PaddleOCR
except ImportError:  # pragma: no cover
    PaddleOCR = None


class ScreenPerceptor:
    def __init__(self, language: str = "ch") -> None:
        self.language = language
        self._ocr = None

    def _get_ocr(self):
        if PaddleOCR is None:
            raise RuntimeError("未安装 paddleocr，请先安装 requirements.txt 中的依赖。")
        if self._ocr is None:
            self._ocr = PaddleOCR(use_angle_cls=True, lang=self.language)
        return self._ocr

    def capture_screen(self) -> Image.Image:
        with mss() as sct:
            monitor = sct.monitors[1]
            shot = sct.grab(monitor)
            return Image.frombytes("RGB", shot.size, shot.rgb)

    def extract_text(self, image: Image.Image) -> tuple[str, list[str]]:
        ocr = self._get_ocr()
        result = ocr.ocr(image)
        lines: list[str] = []

        for block in result or []:
            if not block:
                continue
            for item in block:
                if not item or len(item) < 2:
                    continue
                text_info = item[1]
                if not text_info:
                    continue
                text = str(text_info[0]).strip()
                if text:
                    lines.append(text)

        return "\n".join(lines), lines

    def perceive(self) -> dict[str, Any]:
        image = self.capture_screen()
        ocr_text, ocr_lines = self.extract_text(image)
        return {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "screen_size": list(image.size),
            "ocr_text": ocr_text,
            "ocr_lines": ocr_lines,
        }
