# Lumina PRO

**AI 驱动的电影级提示词工程**

[English](./README.md) | [简体中文](./README_zh-CN.md)

![Lumina PRO Screenshot](./assets/lumina-screenshot.png)

Lumina PRO 是一款先进的工具，旨在将简单的概念转化为高度详细、高质量的图像生成提示词。它利用 Google Gemini 3.0 Pro 模型的强大能力，充当您的虚拟视觉导演，通过电影级的灯光、构图和技术规格来扩展您的创意。

## 功能特性

-   **智能提示词扩展**：将简短的输入转化为全面的“导演处理”提示词。
-   **参考图支持**：上传最多 5 张参考图片，以指导风格、构图和光影。
    ![参考图支持](./assets/lumina-image-ref-screenshot.png)
-   **电影级可视化**：利用 Gemini 的图像生成能力生成高保真预览。
-   **历史记录与管理**：自动保存您的创作，支持重新生成、删除或下载。
-   **批量导出**：将所有生成的资产（图像和 JSON 提示词）打包下载为 ZIP 文件。
-   **全屏查看**：为生成的图像提供沉浸式查看体验。
-   **安全架构**：服务端 API 处理确保您的 API 密钥隐私安全。

## 技术栈

-   **框架**: [Next.js 14+](https://nextjs.org/) (App Router)
-   **语言**: TypeScript
-   **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **运行时**: [Bun](https://bun.sh/)
-   **AI 模型**: Google Gemini 3.0 Pro (`gemini-3-pro-preview` & `gemini-3-pro-image-preview`)
-   **UI 组件**: Shadcn UI, Lucide React, Framer Motion

## 快速开始

### 前置要求

-   已安装 [Bun](https://bun.sh/)。
-   Google Gemini API 密钥。

### 安装步骤

1.  **克隆仓库：**

    ```bash
    git clone <repository-url>
    cd lumina
    ```

2.  **安装依赖：**

    ```bash
    bun install
    ```

3.  **配置环境变量：**

    复制示例环境文件并添加您的 API 密钥：

    ```bash
    cp .env.example .env
    ```

    编辑 `.env` 并设置您的 `GEMINI_API_KEY`：

    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **运行开发服务器：**

    ```bash
    bun run dev
    ```

    在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## Docker 支持

构建并运行容器化应用：

```bash
# 构建镜像
docker build -t lumina-pro .

# 运行容器（传递 API 密钥）
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key_here lumina-pro
```

## 许可证

MIT
