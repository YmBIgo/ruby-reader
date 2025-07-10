## Linux Reader とは？
Linux Reader とは、LLMと一緒にLinuxのコードを読むためのツールです。

#### [できること]
- 人がコードを読まずともLLMが関数探索してくれる
- 前に進んだ関数経路に戻れる
- 調べている関数経路のバグをLLMが見つけてくれる
- 調べている関数をLLMが図にしてくれる
- 調べた関数経路をLLMがレポートにしてくれる

#### [効果]
- Linuxコードをランダムウォークなしに読み進められる
- 土地勘がないと10分以上かかる数百行、数千行の関数のコードリーディングを、LLMが1分で終わらせてくれる
- Linuxコードのバグを見つけられる機能がある
- 頭にいれるだけで暗黙知になりがちな関数経路や関数の説明をLLMがしてくれる

#### [できないこと/人の作業]
- エントリーポイントの把握
- LLMによる関数自動探索（人が判断した方が正確）
- コードベースを分割せず一括でLLMに調べさせること

## 利用方法

1. Linuxコードベース、clangdの準備

```
git clone https://github.com/torvalds/linux
brew install clangd
```

2. compile_commands.json の用意

https://zenn.dev/tmsn/articles/6317bdf591bc97

なども参考にする

```
make defconfig 
bear -- make LLVM=1 -j16 
```

3. vscode のインストール

4. LinuxReader のインストール

```
git clone https://github.com/YmBIgo/LinuxReader
```

5. 設定の入力
clangdのパス、Linuxのパス、compile_commands.json のディレクトリのパス、LLM（OpenAI・Claude・Plamo）を入力

6. チャット画面で探索を開始
最初に、「探索を開始するファイルパス」「探索を開始する関数」「探索の目的」を入力すれば、探索を開始できます。

7. 探索を制御
探索に成功すると、
