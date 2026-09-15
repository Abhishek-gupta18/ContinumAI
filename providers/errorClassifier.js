function classifyError(status, error) {
  if (status === 401) {
    return {
      type: "auth_error",
      message: "Invalid API key",
      statusCode: 401,
    };
  }

  if (status === 429) {
    return {
      type: "rate_limit_error",
      message: "Rate limit exceeded",
      statusCode: 429,
    };
  }

  if (status >= 500) {
    return {
      type: "provider_error",
      message: "Provider error",
      statusCode: status,
    };
  }

  return {
    type: "generic",
    message: error.message || "An unexpected error occurred",
    statusCode: 500,
  };
}

module.exports = { classifyError };