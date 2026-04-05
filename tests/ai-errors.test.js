import { describe, it, expect } from "vitest";
import {
  ApiErrorCode,
  AIError,
  classifyHttpError,
  toAIError,
} from "../js/ai-errors.js";

describe("AI Errors", () => {
  describe("AIError", () => {
    it("should create an error with code and default message", () => {
      const err = new AIError(ApiErrorCode.API_KEY_REQUIRED);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe("API_KEY_REQUIRED");
      expect(err.message).toBe("APIキーが必要です");
      expect(err.name).toBe("AIError");
    });

    it("should append detail to message", () => {
      const err = new AIError(ApiErrorCode.API_KEY_INVALID, {
        detail: "key xyz",
      });
      expect(err.message).toBe("APIキーが無効です: key xyz");
      expect(err.detail).toBe("key xyz");
    });

    it("should preserve status and retryAfter", () => {
      const err = new AIError(ApiErrorCode.RATE_LIMITED, {
        status: 429,
        retryAfter: 60,
      });
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(60);
    });

    it("should expose userMessage getter", () => {
      const err = new AIError(ApiErrorCode.SAFETY_BLOCKED, {
        detail: "blocked",
      });
      expect(err.userMessage).toBe(
        "AIの安全フィルタによりブロックされました: blocked"
      );
    });

    it("should use code as message if unknown code", () => {
      const err = new AIError("UNKNOWN_CODE");
      expect(err.message).toBe("UNKNOWN_CODE");
    });
  });

  describe("classifyHttpError", () => {
    it("should classify 429 as RATE_LIMITED", () => {
      const err = classifyHttpError(
        429,
        JSON.stringify({
          error: { message: "quota exceeded", status: "RESOURCE_EXHAUSTED" },
        })
      );
      expect(err.code).toBe("RATE_LIMITED");
      expect(err.status).toBe(429);
    });

    it("should extract retryAfter from message", () => {
      const err = classifyHttpError(
        429,
        JSON.stringify({
          error: { message: "Retry after 30 seconds" },
        })
      );
      expect(err.retryAfter).toBe(30);
    });

    it("should classify 401 as API_KEY_INVALID", () => {
      const err = classifyHttpError(
        401,
        JSON.stringify({ error: { message: "Unauthorized" } })
      );
      expect(err.code).toBe("API_KEY_INVALID");
      expect(err.status).toBe(401);
    });

    it("should classify 403 as API_KEY_INVALID", () => {
      const err = classifyHttpError(
        403,
        JSON.stringify({
          error: { status: "PERMISSION_DENIED", message: "denied" },
        })
      );
      expect(err.code).toBe("API_KEY_INVALID");
    });

    it("should classify 400 with 'API key' message as API_KEY_INVALID", () => {
      const err = classifyHttpError(
        400,
        JSON.stringify({
          error: { message: "API key not valid. Please pass a valid API key." },
        })
      );
      expect(err.code).toBe("API_KEY_INVALID");
    });

    it("should classify 400 without 'API key' as PROVIDER_ERROR", () => {
      const err = classifyHttpError(
        400,
        JSON.stringify({
          error: { message: "Invalid prompt format" },
        })
      );
      expect(err.code).toBe("PROVIDER_ERROR");
    });

    it("should classify 500 as PROVIDER_ERROR", () => {
      const err = classifyHttpError(
        500,
        JSON.stringify({ error: { message: "Internal server error" } })
      );
      expect(err.code).toBe("PROVIDER_ERROR");
      expect(err.status).toBe(500);
    });

    it("should handle non-JSON error body", () => {
      const err = classifyHttpError(500, "Internal Server Error");
      expect(err.code).toBe("PROVIDER_ERROR");
      expect(err.detail).toContain("Internal Server Error");
    });

    it("should handle PERMISSION_DENIED reason on any status", () => {
      const err = classifyHttpError(
        400,
        JSON.stringify({
          error: { status: "PERMISSION_DENIED", message: "denied" },
        })
      );
      expect(err.code).toBe("API_KEY_INVALID");
    });
  });

  describe("toAIError", () => {
    it("should return AIError as-is", () => {
      const original = new AIError(ApiErrorCode.RATE_LIMITED);
      const result = toAIError(original);
      expect(result).toBe(original);
    });

    it("should wrap TypeError with fetch message as NETWORK_ERROR", () => {
      const err = new TypeError("Failed to fetch");
      const result = toAIError(err);
      expect(result.code).toBe("NETWORK_ERROR");
      expect(result.cause).toBe(err);
    });

    it("should wrap generic Error as PROVIDER_ERROR", () => {
      const err = new Error("something failed");
      const result = toAIError(err);
      expect(result.code).toBe("PROVIDER_ERROR");
    });

    it("should wrap string errors", () => {
      const result = toAIError("string error");
      expect(result.code).toBe("PROVIDER_ERROR");
      expect(result.detail).toBe("string error");
    });
  });

  describe("ApiErrorCode constants", () => {
    it("should be frozen", () => {
      expect(Object.isFrozen(ApiErrorCode)).toBe(true);
    });

    it("should contain expected codes", () => {
      expect(ApiErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ApiErrorCode.API_KEY_REQUIRED).toBe("API_KEY_REQUIRED");
      expect(ApiErrorCode.API_KEY_INVALID).toBe("API_KEY_INVALID");
      expect(ApiErrorCode.SAFETY_BLOCKED).toBe("SAFETY_BLOCKED");
    });
  });
});
