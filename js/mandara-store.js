/**
 * Mandara Store
 * マンダラの状態（State）を中央管理し、変更を通知（Publish/Subscribe）する。
 * 
 * 役割:
 * - 現在選択されているマンダラ (currentMandara)
 * - 全マンダラのリスト (allMandaras)
 * - ユーザーID (currentUserId)
 * - 状態変更時のイベント発火
 */

class MandaraStore {
  constructor() {
    this.state = {
      currentUserId: null,
      currentMandara: null,
      allMandaras: [],
      mandaraOrder: [],
      isLoading: false,
    };
    this.subscribers = [];
  }

  /**
   * 状態を更新し、購読者に通知
   */
  setState(nextState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...nextState };
    
    // 実際に変更があった場合のみ通知 (簡易的な比較)
    if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
      this.notify(this.state, prevState);
    }
  }

  /**
   * 変更を通知
   */
  notify(state, prevState) {
    this.subscribers.forEach(callback => callback(state, prevState));
  }

  /**
   * 状態変更を購読
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    // 登録時に現在の状態を即座に渡す（初期化用）
    callback(this.state, this.state);
    
    // アンサブスクライブ関数を返す
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // --- ゲッター ---
  get currentMandara() { return this.state.currentMandara; }
  get allMandaras() { return this.state.allMandaras; }
  get userId() { return this.state.currentUserId; }
  get mandaraOrder() { return this.state.mandaraOrder; }
}

// シングルトンとしてエクスポート
export const store = new MandaraStore();
