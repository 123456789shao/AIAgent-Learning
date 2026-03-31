from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from src.chains.loop_react_chain import run_weather_loop_react


# 一个最小的 HTTP API 服务：
# 前端把问题发到这里，这里再转给 agent_chain 处理。
class AgentApiHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        # 关闭默认访问日志，避免开发时终端刷太多输出。
        return

    def end_headers(self) -> None:
        # 给前端补上最基本的跨域响应头。
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        # 处理浏览器的预检请求。
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        # 提供一个最简单的健康检查接口。
        path = urlparse(self.path).path
        if path == "/api/health":
            self._send_json(HTTPStatus.OK, {"status": "ok"})
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {path}"})

    def do_POST(self) -> None:
        # 这里只处理 agent 运行接口。
        path = urlparse(self.path).path
        if path != "/api/agent/run":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {path}"})
            return

        try:
            # 从前端请求体里取出输入内容和最大轮数。
            payload = self._read_json()
            user_input = str(payload.get("input", "")).strip()
            max_rounds = int(payload.get("max_rounds", 3))
        except (TypeError, ValueError, json.JSONDecodeError) as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return

        if not user_input:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "input 不能为空"})
            return

        try:
            # 真正执行 loop / ReAct 流程。
            result = run_weather_loop_react(user_input=user_input, max_steps=max_rounds)
        except Exception as error:  # pragma: no cover - demo server fallback
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})
            return

        self._send_json(HTTPStatus.OK, result)

    def _read_json(self) -> dict[str, Any]:
        # 读取请求体并解析成 JSON 对象。
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        data = json.loads(raw_body.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("请求体必须是 JSON 对象")
        return data

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        # 统一返回 JSON 响应。
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_server(host: str = "127.0.0.1", port: int = 8000) -> None:
    # 启动本地服务，默认监听 127.0.0.1:8000。
    server = ThreadingHTTPServer((host, port), AgentApiHandler)
    print(f"Agent API running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
