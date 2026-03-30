from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Any, Callable


class GuiAgentApp:
    def __init__(self, title: str, scan_interval_ms: int, run_once: Callable[[], dict[str, Any]]) -> None:
        self.root = tk.Tk()
        self.root.title(title)
        self.root.geometry("900x700")
        self.scan_interval_ms = scan_interval_ms
        self.run_once = run_once
        self.running = False
        self._after_id: str | None = None

        self.status_var = tk.StringVar(value="已暂停")
        self.updated_at_var = tk.StringVar(value="-")
        self.match_status_var = tk.StringVar(value="未扫描")
        self.scene_var = tk.StringVar(value="未识别")
        self.decision_var = tk.StringVar(value="no_action")
        self.risk_var = tk.StringVar(value="-")
        self.reason_var = tk.StringVar(value="-")
        self.hint_var = tk.StringVar(value="-")
        self.next_step_var = tk.StringVar(value="-")
        self.meta_var = tk.StringVar(value="-")

        self._build_layout()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_layout(self) -> None:
        frame = ttk.Frame(self.root, padding=12)
        frame.pack(fill="both", expand=True)

        header = ttk.Frame(frame)
        header.pack(fill="x", pady=(0, 12))
        ttk.Label(header, text="运行状态:").pack(side="left")
        ttk.Label(header, textvariable=self.status_var).pack(side="left", padx=(4, 16))
        ttk.Label(header, text="最后扫描:").pack(side="left")
        ttk.Label(header, textvariable=self.updated_at_var).pack(side="left", padx=(4, 16))

        buttons = ttk.Frame(frame)
        buttons.pack(fill="x", pady=(0, 12))
        ttk.Button(buttons, text="立即扫描", command=self.scan_once).pack(side="left")
        ttk.Button(buttons, text="开始/暂停", command=self.toggle_running).pack(side="left", padx=(8, 0))

        info = ttk.LabelFrame(frame, text="当前识别结果", padding=12)
        info.pack(fill="x", pady=(0, 12))
        self._kv(info, "命中状态", self.match_status_var, 0)
        self._kv(info, "页面", self.scene_var, 1)
        self._kv(info, "决策", self.decision_var, 2)
        self._kv(info, "风险等级", self.risk_var, 3)
        self._kv(info, "命中原因", self.reason_var, 4)
        self._kv(info, "提示", self.hint_var, 5)
        self._kv(info, "下一步", self.next_step_var, 6)
        self._kv(info, "元信息", self.meta_var, 7)

        debug = ttk.LabelFrame(frame, text="OCR 摘要", padding=12)
        debug.pack(fill="both", expand=True)
        self.ocr_text = tk.Text(debug, height=20, wrap="word")
        self.ocr_text.pack(fill="both", expand=True)

    def _kv(self, parent, label: str, variable: tk.StringVar, row: int) -> None:
        ttk.Label(parent, text=f"{label}:").grid(row=row, column=0, sticky="nw", pady=2)
        ttk.Label(parent, textvariable=variable, wraplength=700, justify="left").grid(row=row, column=1, sticky="nw", pady=2)

    def update_result(self, result: dict[str, Any]) -> None:
        decision = result.get("decision", {})
        perception = result.get("perception", {})
        status = result.get("status", "ok")
        matched = bool(decision.get("matched"))
        self.updated_at_var.set(result.get("timestamp", "-"))
        self.match_status_var.set("已命中规则" if matched else ("扫描失败" if status == "error" else "未命中规则"))
        self.scene_var.set(decision.get("scene_name") or "未识别到已配置页面")
        self.decision_var.set(decision.get("decision_type") or "no_action")
        self.risk_var.set(decision.get("risk_level") or "-")
        self.reason_var.set(decision.get("reason") or "-")
        self.hint_var.set(decision.get("hint") or "-")
        self.next_step_var.set(decision.get("next_step") or "-")
        screen_size = perception.get("screen_size", [])
        elapsed = result.get("elapsed_ms", 0)
        self.meta_var.set(f"status={status}, screen_size={screen_size}, elapsed_ms={elapsed}")

        self.ocr_text.delete("1.0", tk.END)
        self.ocr_text.insert(tk.END, perception.get("ocr_text") or "未识别到文字。")

    def scan_once(self) -> None:
        try:
            result = self.run_once()
        except Exception as exc:  # pragma: no cover
            self.status_var.set("扫描失败")
            self.updated_at_var.set("-")
            self.match_status_var.set("扫描失败")
            self.scene_var.set("未识别")
            self.decision_var.set("no_action")
            self.risk_var.set("-")
            self.reason_var.set(str(exc))
            self.hint_var.set("-")
            self.next_step_var.set("-")
            self.meta_var.set("status=error")
            self.ocr_text.delete("1.0", tk.END)
            self.ocr_text.insert(tk.END, "本轮扫描失败。")
            return

        self.status_var.set("已运行一轮")
        self.update_result(result)

    def toggle_running(self) -> None:
        self.running = not self.running
        self.status_var.set("运行中" if self.running else "已暂停")
        if self.running:
            self._schedule_next()
        elif self._after_id:
            self.root.after_cancel(self._after_id)
            self._after_id = None

    def _schedule_next(self) -> None:
        self.scan_once()
        if self.running:
            self._after_id = self.root.after(self.scan_interval_ms, self._schedule_next)

    def _on_close(self) -> None:
        if self._after_id:
            self.root.after_cancel(self._after_id)
        self.root.destroy()

    def start(self) -> None:
        self.root.mainloop()
