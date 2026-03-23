// 统一的 Day6 错误基类。
export class AppError extends Error {
  constructor(message: string, readonly type: string, readonly statusCode = 500) {
    super(message);
  }
}

// 配置错误。
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "ConfigError", 500);
  }
}

// 检索相关错误。
export class RetrievalError extends AppError {
  constructor(message: string) {
    super(message, "RetrievalError", 400);
  }
}

// 超时错误。
export class TimeoutError extends AppError {
  constructor(message: string) {
    super(message, "TimeoutError", 504);
  }
}

// 模型提供方错误。
export class ProviderError extends AppError {
  constructor(message: string) {
    super(message, "ProviderError", 502);
  }
}

// 校验错误。
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "ValidationError", 400);
  }
}

// 把未知错误转成统一结构。
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes("超时")) {
      return new TimeoutError(error.message);
    }

    if (error.message.includes("索引") || error.message.includes("检索")) {
      return new RetrievalError(error.message);
    }

    if (error.message.includes("JSON") || error.message.includes("校验")) {
      return new ValidationError(error.message);
    }

    return new ProviderError(error.message);
  }

  return new AppError(String(error), "UnknownError", 500);
}
