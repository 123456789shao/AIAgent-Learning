from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import requests
from langchain_core.tools import tool
from pydantic import BaseModel, Field

from src.config.env import load_env


class WeatherResult(BaseModel):
    location_name: str = Field(description="城市名称")
    region: str = Field(description="地区")
    country: str = Field(description="国家")
    local_time: str = Field(description="当地时间")
    condition_text: str = Field(description="天气描述")
    temp_c: float = Field(description="当前温度（摄氏度）")
    feelslike_c: float = Field(description="体感温度（摄氏度）")
    humidity: int = Field(description="湿度")
    wind_kph: float = Field(description="风速（公里/小时）")


class WeatherToolInput(BaseModel):
    city: str = Field(description="要查询天气的城市名称，例如北京、上海")


def build_weather_api_url(city: str) -> str:
    query = urlencode({
        "key": require_weather_api_key(),
        "q": city,
        "lang": "zh",
    })
    return f"https://api.weatherapi.com/v1/current.json?{query}"


def require_weather_api_key() -> str:
    env = load_env()
    if not env.weather_api_key:
        raise ValueError("缺少 WEATHER_API_KEY，请先在 .env 中配置后再使用 weather tool")
    return env.weather_api_key


def query_weather(city: str) -> WeatherResult:
    if not city.strip():
        raise ValueError("city 不能为空")

    response = requests.get(build_weather_api_url(city.strip()), timeout=15)
    if not response.ok:
        raise ValueError(f"WeatherAPI 查询失败: {response.status_code} {response.reason}")

    data: dict[str, Any] = response.json()
    location = data.get("location") or {}
    current = data.get("current") or {}
    condition = current.get("condition") or {}

    location_name = location.get("name")
    region = location.get("region")
    country = location.get("country")
    local_time = location.get("localtime")
    condition_text = condition.get("text")
    temp_c = current.get("temp_c")
    feelslike_c = current.get("feelslike_c")
    humidity = current.get("humidity")
    wind_kph = current.get("wind_kph")

    required_values = {
        "location.name": location_name,
        "location.region": region,
        "location.country": country,
        "location.localtime": local_time,
        "current.condition.text": condition_text,
        "current.temp_c": temp_c,
        "current.feelslike_c": feelslike_c,
        "current.humidity": humidity,
        "current.wind_kph": wind_kph,
    }
    missing_fields = [key for key, value in required_values.items() if value is None]
    if missing_fields:
        raise ValueError(f"WeatherAPI 返回的天气数据不完整: {', '.join(missing_fields)}")

    return WeatherResult(
        location_name=str(location_name),
        region=str(region),
        country=str(country),
        local_time=str(local_time),
        condition_text=str(condition_text),
        temp_c=float(temp_c),
        feelslike_c=float(feelslike_c),
        humidity=int(humidity),
        wind_kph=float(wind_kph),
    )


@tool("get_weather", args_schema=WeatherToolInput)
def get_weather(city: str) -> str:
    """查询指定城市的当前天气。"""
    weather = query_weather(city)
    return (
        f"{weather.location_name}，{weather.region}，{weather.country}；"
        f"当地时间 {weather.local_time}；"
        f"天气 {weather.condition_text}；"
        f"当前温度 {weather.temp_c}°C；"
        f"体感温度 {weather.feelslike_c}°C；"
        f"湿度 {weather.humidity}%；"
        f"风速 {weather.wind_kph} km/h。"
    )
