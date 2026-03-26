// 统一的 Day7 错误基类。
export class AppError extends Error {
  constructor(message: string, readonly type: string, readonly statusCode = 500) {
    super(message);
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "ConfigError", 500);
  }
}

export class RetrievalError extends AppError {
  constructor(message: string) {
    super(message, "RetrievalError", 400);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string) {
    super(message, "TimeoutError", 504);
  }
}

export class ProviderError extends AppError {
  constructor(message: string) {
    super(message, "ProviderError", 502);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "ValidationError", 400);
  }
}

export class AuthError extends AppError {
  constructor(message = "未登录，无法调用当前接口。") {
    super(message, "AuthError", 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, readonly retryAfterSeconds: number) {
    super(message, "RateLimitError", 429);
  }
}

// 把底层异常收敛成统一的产品错误，方便 API 与 SSE 用一致格式对外返回。
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if ("code" in error && error.code === "EADDRINUSE") {
      return new ConfigError("端口已被占用，请先关闭已有服务，或在 .env 中修改 PORT 后重试。");
    }

    if (error.message.includes("未登录") || error.message.includes("登录")) {
      return new AuthError(error.message);
    }

    if (error.message.includes("超时")) {
      return new TimeoutError(error.message);
    }

    if (error.message.includes("限流")) {
      return new RateLimitError(error.message, 60);
    }

    if (error.message.includes("索引") || error.message.includes("检索")) {
      return new RetrievalError(error.message);
    }

    if (error.message.includes("JSON") || error.message.includes("校验") || error.message.includes("引用")) {
      return new ValidationError(error.message);
    }

    return new ProviderError(error.message);
  }

  return new AppError(String(error), "UnknownError", 500);
}
