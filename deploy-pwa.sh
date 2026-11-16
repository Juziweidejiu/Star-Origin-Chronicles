#!/bin/bash
# 破晓佣兵团 PWA 自动同步与容器部署脚本
# 每次本地构建后或服务器重启后执行此脚本即可确保游戏上线

SRC_DIR="/home/ubuntu/reverse-game/dist"
CONTAINER="sparkyfitness-sparkyfitness-frontend-1"
TARGET_DIR="/usr/share/nginx/html/game"

if [ ! -d "$SRC_DIR" ]; then
    echo "Error: Source directory $SRC_DIR does not exist."
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: Container $CONTAINER is not running."
    exit 1
fi

echo "Syncing $SRC_DIR into $CONTAINER:$TARGET_DIR..."
docker exec "$CONTAINER" mkdir -p "$TARGET_DIR"
docker cp "$SRC_DIR/." "$CONTAINER:$TARGET_DIR/"
docker exec "$CONTAINER" chown -R nginx:nginx "$TARGET_DIR" || true

echo "Done! Verified status:"
docker exec "$CONTAINER" ls -la "$TARGET_DIR"
