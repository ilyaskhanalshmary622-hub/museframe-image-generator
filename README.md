# MuseFrame Image Generator

一个独立的 Grsai 生图 Web 工具。

## 环境变量

```text
IMAGE_API_KEY=你的 Grsai API Key
IMAGE_API_BASE_URL=https://grsai.dakka.com.cn
IMAGE_MODEL=gpt-image-2.5
MUSEFRAME_ACCESS_PASSWORD=8611
MUSEFRAME_DATA_DIR=/opt/render/project/src/data
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

## 作品与任务持久化

作品记录按 Grsai API Key 的哈希隔离，切换浏览器时在「设置」中输入同一个 Key 即可同步。服务器保存最近 5,000 条记录，不再按 7 天自动过期；已完成作品与任务会在页面启动时从服务器载入，当前浏览器的本地记录也会在保存 Key 后并入服务器。

Render 免费 Web 服务会在空闲休眠、重启或重新部署时清除本地文件。要让 `data/museframe_tasks.json` 跨这些情况保留，需要给付费 Web 服务挂载 Render Persistent Disk，挂载路径设为 `/opt/render/project/src/data`。未挂载持久盘时，服务端目录仍是临时存储。
