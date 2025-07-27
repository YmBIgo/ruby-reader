## What is Ruby Reader?

**Ruby Reader** is a tool for reading Ruby code together with an LLM (Large Language Model).

> // TODO: Embed a YouTube video about Ruby

#### \[Features]

* Lets the LLM explore functions without requiring humans to manually read code
* Allows you to backtrack through previously explored function paths
* Detects potential bugs in the explored function path using the LLM
* Visualizes the function under investigation as a diagram
* Summarizes the explored function path into a report using the LLM

#### \[Benefits]

* Enables reading Ruby code without aimless random walks
* Allows LLMs to read and summarize hundreds or thousands of lines of functions in under a minute—something that would normally take 10+ minutes for someone unfamiliar with the codebase
* Helps detect bugs in Ruby code
* Explains function paths and logic that would otherwise remain implicit knowledge

#### \[Limitations / Human Tasks]

* Identifying the entry point of the codebase
* Manually selecting which function to start exploring (automatic exploration by LLM is not as accurate)
* The tool does not yet support analyzing an entire codebase in one go (you need to guide it gradually)

---

## How to Use

Ruby Reader is not yet available as a public VSCode extension.
Once released, installation instructions will be provided here.

#### Requirements

* `ruby-lsp` (version 0.20.0 or later)
* A Ruby codebase
* VSCode version 1.100.0 or later
* An API key for one of: OpenAI, Anthropic, PLaMo, or Gemini

### 1. Install Ruby LSP and prepare your codebase

```bash
brew install ruby-lsp
```

### 2. Install VSCode

Make sure you’re using version 1.100.0 or later.

### 3. Download Ruby Reader for VSCode

Download from the marketplace:
[https://marketplace.visualstudio.com/items?itemName=coffeecupjapan.ruby-reader\&ssr=false#overview](https://marketplace.visualstudio.com/items?itemName=coffeecupjapan.ruby-reader&ssr=false#overview)

### 4. Open the Extension

Once downloaded, open the Command Palette with `Command + Shift + P`, and click “**Open Ruby in New Tab**”.
If a tab opens on the right side, it was successful.

### 5. Enter Settings

Provide the paths to:

* your `ruby-lsp` binary
* your Ruby project
* your `compile_commands.json` directory
* and select your LLM (OpenAI, Claude, Plamo, etc.)

### 6. Start Exploration in the Chat Interface

To begin, enter:

* the file path to start exploring from
* the function to begin with
* the purpose of the exploration

### 7. Guide the Exploration

The LLM will suggest important functions within the current function.
You then select which one to explore next.
This process repeats as long as you like, allowing you to explore deeper step by step.

---

## Release Notes

#### 1.0.0

Initial release of RubyReader

---
