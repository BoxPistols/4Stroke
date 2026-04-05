// MANDARA Insight - API設定タブ UI

import { listProviders, getModelInfo, ModelTier } from "./ai-providers.js";
import {
  getActiveProvider,
  setActiveProvider,
  getActiveModel,
  setActiveModel,
  getApiKey,
  setApiKey,
  testConnection,
} from "./ai-service.js";
import { hasSharedKey } from "./ai-config.js";
import { getRemainingUsage, DAILY_LIMIT } from "./ai-rate-limiter.js";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * API設定タブをレンダリング
 */
export function renderApiSettings() {
  const container = document.getElementById("api-settings");
  if (!container) return;

  const providers = listProviders();
  const activeProvider = getActiveProvider();
  const activeModel = getActiveModel();
  const currentProvider = providers.find((p) => p.id === activeProvider);
  const userKey = getApiKey(activeProvider);

  // プロバイダー選択
  const providerOptionsHtml = providers
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === activeProvider ? "selected" : ""}>${escapeHtml(p.name)}</option>`
    )
    .join("");

  // モデル選択 (現在のプロバイダーのモデル)
  const modelOptionsHtml = (currentProvider?.models || [])
    .map((m) => {
      const isPremium = m.tier === ModelTier.PREMIUM;
      const disabled = isPremium && !userKey;
      const disabledAttr = disabled ? "disabled" : "";
      const tierBadge = isPremium ? "（要キー）" : "（無料）";
      const lockMark = disabled ? " 🔒" : "";
      return `<option value="${m.id}" ${m.id === activeModel ? "selected" : ""} ${disabledAttr}>${escapeHtml(m.label)}${tierBadge}${lockMark}</option>`;
    })
    .join("");

  // 使用状況
  const usageHtml = renderUsageSection(activeProvider, activeModel, userKey);

  // 現在のプロバイダーの共有キー状態
  const hasShared = hasSharedKey(activeProvider);
  const sharedKeyStatus = hasShared
    ? '<span class="api-shared-status has-key">共有キー設定済</span>'
    : '<span class="api-shared-status no-key">共有キー未設定</span>';

  container.innerHTML = `
    <div class="api-section">
      <h4 class="api-section-title">プロバイダー</h4>
      <select id="api-provider-select" class="api-select">${providerOptionsHtml}</select>
      <div class="api-provider-info">${sharedKeyStatus}</div>
    </div>

    <div class="api-section">
      <h4 class="api-section-title">モデル</h4>
      <select id="api-model-select" class="api-select">${modelOptionsHtml}</select>
    </div>

    ${usageHtml}

    <div class="api-section">
      <h4 class="api-section-title">自分のAPIキー（オプション）</h4>
      <p class="api-hint">
        自分のキーを入れると無制限かつ Premium モデルが利用できます。
        <a href="${escapeHtml(currentProvider?.apiKeyUrl || "")}" target="_blank" rel="noopener">キーを取得</a>
      </p>
      <div class="api-key-input-group">
        <input
          type="password"
          id="api-key-input"
          class="api-key-input"
          placeholder="${escapeHtml(currentProvider?.apiKeyHint || "")}"
          value="${escapeHtml(userKey)}"
          autocomplete="off"
        />
        <button type="button" id="api-key-toggle" class="api-key-toggle">表示</button>
      </div>
      <div class="api-key-actions">
        <button type="button" id="api-save-key" class="api-btn api-btn-primary">保存</button>
        <button type="button" id="api-clear-key" class="api-btn api-btn-danger" ${!userKey ? "disabled" : ""}>削除</button>
        <button type="button" id="api-test-connection" class="api-btn api-btn-secondary">接続テスト</button>
      </div>
      <div id="api-status" class="api-status"></div>
    </div>

    <p class="api-note">
      キーはブラウザのlocalStorageにのみ保存されます。サーバーには送信されません。
    </p>
  `;

  attachApiSettingsListeners();
}

function renderUsageSection(providerId, modelId, userKey) {
  const model = getModelInfo(providerId, modelId);
  if (!model) return "";

  if (model.tier === ModelTier.PREMIUM) {
    return `
      <div class="api-section api-usage">
        <div class="api-usage-label">${userKey ? "自分のキー利用中 (無制限)" : "自分のキーが必要です"}</div>
      </div>`;
  }

  if (userKey) {
    return `
      <div class="api-section api-usage">
        <div class="api-usage-label">自分のキー利用中 (無制限)</div>
      </div>`;
  }

  const remaining = getRemainingUsage(`${providerId}:${modelId}`);
  const percent = Math.round((remaining / DAILY_LIMIT) * 100);
  const barClass = remaining <= 5 ? "low" : remaining <= 15 ? "medium" : "high";

  return `
    <div class="api-section api-usage">
      <div class="api-usage-label">本日の残り利用回数 <span class="api-usage-count">${remaining} / ${DAILY_LIMIT}</span></div>
      <div class="api-usage-bar">
        <div class="api-usage-fill ${barClass}" style="width: ${percent}%"></div>
      </div>
    </div>`;
}

function attachApiSettingsListeners() {
  const providerSelect = document.getElementById("api-provider-select");
  const modelSelect = document.getElementById("api-model-select");
  const keyInput = document.getElementById("api-key-input");
  const toggleBtn = document.getElementById("api-key-toggle");
  const saveBtn = document.getElementById("api-save-key");
  const clearBtn = document.getElementById("api-clear-key");
  const testBtn = document.getElementById("api-test-connection");
  const statusEl = document.getElementById("api-status");

  // プロバイダー変更
  if (providerSelect) {
    providerSelect.addEventListener("change", (e) => {
      setActiveProvider(e.target.value);
      renderApiSettings(); // 再描画
    });
  }

  // モデル変更
  if (modelSelect) {
    modelSelect.addEventListener("change", (e) => {
      setActiveModel(e.target.value);
      renderApiSettings();
    });
  }

  // 表示トグル
  if (toggleBtn && keyInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = keyInput.type === "password";
      keyInput.type = isPassword ? "text" : "password";
      toggleBtn.textContent = isPassword ? "隠す" : "表示";
    });
  }

  // 保存
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const key = keyInput?.value?.trim() || "";
      if (!key) {
        showStatus(statusEl, "APIキーを入力してください", "error");
        return;
      }
      setApiKey(key, getActiveProvider());
      showStatus(statusEl, "APIキーを保存しました", "success");
      renderApiSettings();
    });
  }

  // 削除
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("保存されたAPIキーを削除しますか？")) return;
      setApiKey("", getActiveProvider());
      showStatus(statusEl, "APIキーを削除しました", "success");
      renderApiSettings();
    });
  }

  // 接続テスト
  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      const key = keyInput?.value?.trim() || getApiKey(getActiveProvider());
      if (!key) {
        showStatus(statusEl, "APIキーを入力してください", "error");
        return;
      }
      testBtn.disabled = true;
      testBtn.textContent = "テスト中...";
      showStatus(statusEl, "接続確認中...", "checking");

      const providerId = getActiveProvider();
      const modelId = getActiveModel();
      const result = await testConnection(key, providerId, modelId);

      testBtn.disabled = false;
      testBtn.textContent = "接続テスト";

      if (result.ok) {
        showStatus(statusEl, "接続成功 ✓", "success");
      } else {
        showStatus(statusEl, result.error.userMessage, "error");
      }
    });
  }
}

function showStatus(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `api-status ${type}`;
}
