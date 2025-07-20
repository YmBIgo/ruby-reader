## Ruby Reader とは？
Ruby Reader とは、LLMと一緒にRubyのコードを読むためのツールです。

// TODO : Ruby のYoutube動画を貼る

#### [できること]
- 人がコードを読まずともLLMが関数探索してくれる
- 前に進んだ関数経路に戻れる
- 調べている関数経路のバグをLLMが見つけてくれる
- 調べている関数をLLMが図にしてくれる
- 調べた関数経路をLLMがレポートにしてくれる

#### [効果]
- Rubyのコードをランダムウォークなしに読み進められる
- 土地勘がないと10分以上かかる数百行、数千行の関数のコードリーディングを、LLMが1分で終わらせてくれる
- Rubyのコードのバグを見つけられる機能がある
- 頭にいれるだけで暗黙知になりがちな関数経路や関数の説明をLLMがしてくれる

#### [できないこと/人の作業]
- エントリーポイントの把握
- LLMによる関数自動探索（人が判断した方が正確）
- コードベースを分割せず一括でLLMに調べさせること

## 利用方法
VSCode拡張としてはまだ公開していません。  
公開し次第、VSCode拡張でのインストール方法を書きます。

#### 用意するもの
ruby-lsp(0.20.0系以上), Rubyのコード, vscode(1.100.0以上)  
OpenAIかAnthropicかPLaMoかGeminiのAPIキー

1. Rubyコードベース、ruby-lspの準備

```
brew install ruby-lsp
```

2. vscode のインストール

1.100.0 以上をインストールしてください

3. VSCode で RubyReader をダウンロード

https://marketplace.visualstudio.com/items?itemName=coffeecupjapan.ruby-reader&ssr=false#overview

#### 開く
ダウンロード完了したら、「Command + Shift + p」でコマンドパレットを開き、「Open Ruby in New Tab」をクリック  
クリック後に、右側にタブウィンドウが出てくれば成功です

4. 設定の入力
ruby-lspのパス、Rubyプロジェクトのパス、compile_commands.json のディレクトリのパス、LLM（OpenAI・Claude・Plamo）を入力

5. チャット画面で探索を開始
最初に、「探索を開始するファイルパス」「探索を開始する関数」「探索の目的」を入力すれば、探索を開始できます。

6. 探索を制御
しばらくすると、LLMが関数の中から重要な関数を選ぶので、そこから内容を探索したい関数を選択します。  
すると、またLLMが関数の中から重要な関数を選ぶので、そこから再度探索したい関数を選択します。  
以上の流れを、自分がいいと思うまで続けます。

## Release Notes

#### 1.0.0

RubyReaderの最初のリリース
