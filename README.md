# 刘扬金 AI 商品图生成助手

一个独立的 Grsai 生图 Web 工具。

## 环境变量

```text
IMAGE_API_KEY=你的 Grsai API Key
IMAGE_API_BASE_URL=https://grsai.dakka.com.cn
IMAGE_MODEL=gpt-image-2.5
MUSEFRAME_ACCESS_PASSWORD=8611
```

## 本地运行

```powershell
$env:IMAGE_API_KEY="你的 Grsai API Key"
$env:IMAGE_API_BASE_URL="https://grsai.dakka.com.cn"
$env:IMAGE_MODEL="gpt-image-2.5"
$env:MUSEFRAME_ACCESS_PASSWORD="8611"
python server.py
```

打开：

```text
http://127.0.0.1:8765/
```
