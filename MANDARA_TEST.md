# Mandara 総合テスト手順

## 事前準備

1. ブラウザのコンソールを開く（F12 → Console タブ）
2. `http://localhost:8000/mandara.html` にアクセス

## テスト1: 基本機能

### 1.1 新規Mandara作成
- [ ] NEWボタンをクリック
- [ ] 期待: 新しい空のMandaraが作成される
- [ ] コンソール確認: `[INFO] Mandara app initialized`

### 1.2 タイトル入力
- [ ] タイトル欄に「テストマンダラ」と入力
- [ ] 期待: 自動保存メッセージが表示される
- [ ] コンソール確認: `[INFO] Saved mandara:` が表示される

### 1.3 9マスセル入力
- [ ] セル1-9にそれぞれテキストを入力
- [ ] セル5（中心）に「中心キーワード」と入力
- [ ] 期待: 各入力後に自動保存される
- [ ] コンソール確認: `[INFO] Saved mandara:` が表示される

### 1.4 メモ入力
- [ ] 備考メモ欄に文章を入力
- [ ] 期待: 自動保存される
- [ ] コンソール確認: `[INFO] Saved mandara:` が表示される

## テスト2: タグ機能

### 2.1 タグ追加
- [ ] タグ入力欄に「ビジネス」と入力してEnter
- [ ] 期待: タグが追加され表示される
- [ ] コンソール確認:
  - `[INFO] Tag added: ビジネス`
  - `[INFO] Rendered tags: 1`
  - `[INFO] Saved mandara: {... tags: 1 ...}`

### 2.2 複数タグ追加
- [ ] 「アイデア」「プロジェクト」を追加
- [ ] 期待: 3つのタグが表示される
- [ ] コンソール確認: `[INFO] Rendered tags: 3`

### 2.3 タグ削除
- [ ] タグの「×」ボタンをクリック
- [ ] 期待: タグが削除される
- [ ] コンソール確認:
  - `[INFO] Tag remove button clicked: ビジネス`
  - `[INFO] Tag removed: ビジネス (3 -> 2)`
  - `[INFO] Rendered tags: 2`

## テスト3: TODO機能

### 3.1 TODO追加
- [ ] TODO入力欄に「タスク1」と入力してEnter
- [ ] 期待: TODOが追加され表示される
- [ ] コンソール確認:
  - `[INFO] Todo added: {id: "todo_xxx", text: "タスク1", completed: false}`
  - `[INFO] Rendered todos: 1`
  - `[INFO] Saved mandara: {... todos: 1 ...}`

### 3.2 複数TODO追加
- [ ] 「タスク2」「タスク3」を追加
- [ ] 期待: 3つのTODOが表示される
- [ ] コンソール確認: `[INFO] Rendered todos: 3`

### 3.3 TODOチェック
- [ ] チェックボックスをクリック
- [ ] 期待: テキストに取り消し線が表示される
- [ ] コンソール確認:
  - `[INFO] Todo checkbox changed`
  - `[INFO] Todo toggled: todo_xxx completed: true`

### 3.4 TODO削除
- [ ] TODOの「×」ボタンをクリック
- [ ] 期待: TODOが削除される
- [ ] コンソール確認:
  - `[INFO] Todo remove button clicked`
  - `[INFO] Todo removed: todo_xxx (3 -> 2)`

## テスト4: リロード耐久性

### 4.1 データ入力後リロード
- [ ] すべてのデータを入力（タイトル、セル、メモ、タグ、TODO）
- [ ] ブラウザをリロード（F5）
- [ ] 期待: すべてのデータが保持されている
- [ ] コンソール確認: `[INFO] Loaded mandara from URL: mandara_xxx`

### 4.2 URLパラメータ確認
- [ ] URLに `?id=mandara_xxx` が含まれることを確認

## テスト5: リスト・検索機能

### 5.1 リスト表示
- [ ] LISTボタンをクリック
- [ ] 期待: Mandaraリストが表示される
- [ ] コンソール確認: `[INFO] List view button listener attached`

### 5.2 検索機能
- [ ] SEARCHボタンをクリック
- [ ] 検索欄にキーワードを入力
- [ ] 期待: フィルタリングされたリストが表示される
- [ ] コンソール確認: `[INFO] Search button clicked`

### 5.3 ソート機能
- [ ] ソート選択で「タイトル (A-Z)」を選択
- [ ] 期待: リストがソートされる

## テスト6: 削除機能

### 6.1 Mandara削除
- [ ] 「削除」ボタンをクリック
- [ ] 確認ダイアログで「OK」
- [ ] 期待: Mandaraが削除され、次のMandaraが表示される
- [ ] コンソール確認:
  - `[INFO] Attempting to delete mandara: mandara_xxx`
  - `[SUCCESS] Deleted mandara: mandara_xxx`

## テスト7: デバッグコマンド

コンソールで以下のコマンドを実行：

### 7.1 現在の状態確認
```javascript
mandaraDebug.logCurrentState()
```
期待: 現在の状態がコンソールに表示される

### 7.2 localStorageの内容確認
```javascript
mandaraDebug.getLocalStorage()
```
期待: localStorageに保存されているMandaraの配列が表示される

### 7.3 現在のMandara確認
```javascript
mandaraDebug.getCurrentMandara()
```
期待: 現在のMandaraオブジェクトが表示される（tags、todos含む）

### 7.4 強制保存
```javascript
await mandaraDebug.forceSave()
```
期待: 即座に保存される

## テスト8: 4Stroke連携

### 8.1 4Strokeから展開
- [ ] `main.html` に移動
- [ ] GARAGE-Aのタイトルに「プロジェクトX」と入力
- [ ] Keyセルに「革新的アイデア」と入力
- [ ] 「→ MANDARA」ボタンをクリック
- [ ] 期待:
  - Mandaraページに遷移
  - タイトルが「プロジェクトX」
  - 中心セル（セル5）が「革新的アイデア」
- [ ] コンソール確認: `[INFO] 4STROKEから展開しました`

### 8.2 URLパラメータ変更確認
- [ ] URLが `?from=4stroke` から `?id=mandara_xxx` に変わることを確認

## トラブルシューティング

### 問題: タグ/TODOが保存されない

1. コンソールで確認:
```javascript
mandaraDebug.getCurrentMandara()
```
- `tags` 配列が存在するか？
- `todos` 配列が存在するか？

2. localStorageを確認:
```javascript
mandaraDebug.getLocalStorage()
```

3. 強制保存を試す:
```javascript
await mandaraDebug.forceSave()
mandaraDebug.getLocalStorage()
```

### 問題: ボタンが動作しない

コンソールで確認:
- `[WARN] xxx button not found` が表示されていないか？
- ボタンクリック時にログが出ているか？

### 問題: リロードでデータが消える

1. URLを確認:
   - `?id=mandara_xxx` が含まれているか？

2. localStorageを確認:
```javascript
localStorage.getItem('mandaras')
```

## 成功基準

✅ すべてのテストケースがパスする
✅ リロード後もデータが保持される
✅ コンソールにエラーがない
✅ タグ・TODOの追加・削除が動作する
✅ 検索・ソート・削除が動作する
✅ 4Stroke連携が動作する

## テスト完了後

```javascript
// すべてクリアしたい場合
mandaraDebug.clearAll()
```
