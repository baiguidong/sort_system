# 第一阶段: 构建阶段
FROM golang:1.21-alpine AS builder

RUN echo "https://mirrors.tencent.com/alpine/v3.19/main" > /etc/apk/repositories \
 && echo "https://mirrors.tencent.com/alpine/v3.19/community" >> /etc/apk/repositories \
 && apk update

ENV GOPROXY=https://goproxy.cn,direct \
    GOSUMDB=sum.golang.org
    
# 安装必要的编译工具
RUN apk add --no-cache git gcc musl-dev

# 设置工作目录
WORKDIR /app

# 复制 go.mod 和 go.sum 并下载依赖
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 编译 Go 程序
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o sorting-system .

# 第二阶段: 运行阶段
FROM alpine:latest

RUN echo "https://mirrors.tencent.com/alpine/v3.19/main" > /etc/apk/repositories \
 && echo "https://mirrors.tencent.com/alpine/v3.19/community" >> /etc/apk/repositories \
 && apk update
 
# 安装必要的运行时依赖
RUN apk add --no-cache ca-certificates tzdata

# 设置时区为中国
ENV TZ=Asia/Shanghai

# 创建非 root 用户
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# 设置工作目录
WORKDIR /app

# 从构建阶段复制编译好的程序
COPY --from=builder /app/sorting-system .

# 复制静态文件
COPY --from=builder /app/static ./static

# 创建上传文件目录并设置权限
RUN mkdir -p uploads && \
    chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/login || exit 1

# 运行程序
CMD ["./sorting-system"]
