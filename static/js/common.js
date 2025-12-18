// API 基础URL
const API_BASE = window.location.origin;

// 获取本地存储的用户信息
function getUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

// 保存用户信息到本地存储
function saveUserInfo(userInfo) {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

// 清除用户信息
function clearUserInfo() {
    localStorage.removeItem('userInfo');
}

// 检查登录状态
function checkLogin() {
    const userInfo = getUserInfo();
    if (!userInfo) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// 通用API请求函数
async function apiRequest(url, options = {}) {
    const userInfo = getUserInfo();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (userInfo && userInfo.user_id) {
        headers['X-User-ID'] = userInfo.user_id.toString();
        headers['Token'] = userInfo.token;
    }

    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (response.status === 401) {
            clearUserInfo();
            window.location.href = '/login';
            throw new Error('未授权，请重新登录');
        }

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 上传图片
async function uploadImage(file) {
    const userInfo = getUserInfo();
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(API_BASE + '/api/upload', {
            method: 'POST',
            headers: {
                'X-User-ID': userInfo.user_id.toString(),
                'token': userInfo.token
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '上传失败');
        }

        return data.data.url;
    } catch (error) {
        console.error('上传图片错误:', error);
        throw error;
    }
}

// 格式化数字
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || num === '') return '0.00';
    return parseFloat(num).toFixed(decimals);
}

// 格式化日期时间
function formatDateTime(datetime) {
    if (!datetime) return '';
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 显示提示信息
function showMessage(message, type = 'info') {
    const color = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db';
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-5px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-5px); }
    }
`;
document.head.appendChild(style);

// 初始化表格列宽调整功能
function initColumnResize(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const thead = table.querySelector('thead');
    if (!thead) return;

    const ths = thead.querySelectorAll('th');

    // 针对移动端优化表格显示
    optimizeMobileTableDisplay();

    ths.forEach((th, index) => {
        // 跳过特别窄的列（如复选框列、ID列）
        const skipColumns = ['col-checkbox', 'col-id'];
        const hasSkipClass = skipColumns.some(cls => th.classList.contains(cls));
        if (hasSkipClass) {
            // 为这些列也添加手柄，但宽度限制更严格
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.style.opacity = '0.3'; // 视觉上淡一些
            th.appendChild(resizeHandle);
            return;
        }

        // 应用初始宽度(如果CSS中有定义)
        const computedWidth = window.getComputedStyle(th).width;
        if (computedWidth && computedWidth !== 'auto') {
            th.style.width = computedWidth;
            th.style.minWidth = computedWidth;
        }

        // 为每个 th 添加拖动手柄
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        th.appendChild(resizeHandle);

        // 添加提示：表头可拖动调整宽度（仅在第一个可调整列显示一次）
        const hasSeenTip = sessionStorage.getItem('resize-tip-shown');
        if (!hasSeenTip && window.innerWidth <= 768 && !hasSkipClass) {
            setTimeout(() => {
                const tip = document.createElement('div');
                tip.textContent = '拖动调整列宽';
                tip.style.cssText = `
                    position: absolute;
                    bottom: -18px;
                    left: 0;
                    font-size: 9px;
                    color: #fff;
                    background: rgba(102, 126, 234, 0.9);
                    padding: 2px 4px;
                    border-radius: 2px;
                    white-space: nowrap;
                    z-index: 10;
                    pointer-events: none;
                    animation: fadeInOut 2.5s ease-in-out;
                `;
                th.style.position = 'relative';
                th.appendChild(tip);
                setTimeout(() => tip.remove(), 2500);
                sessionStorage.setItem('resize-tip-shown', 'true');
            }, 800);
        }

        let startX = 0;
        let startWidth = 0;
        let currentTh = null;
        let isResizing = false;

        // 鼠标/触摸事件处理
        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation();

            currentTh = th;
            startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            startWidth = th.offsetWidth;
            isResizing = true;

            resizeHandle.classList.add('resizing');
            th.classList.add('resizing');

            // 统一绑定移动和结束事件
            if (e.type.includes('mouse')) {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            } else {
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd);
            }
        };

        const handleMouseMove = (e) => {
            if (!isResizing || !currentTh) return;
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            currentTh.style.width = newWidth + 'px';
            currentTh.style.minWidth = newWidth + 'px';
        };

        const handleMouseUp = () => {
            if (isResizing) {
                finishResize();
            }
        };

        const handleTouchMove = (e) => {
            if (!isResizing || !currentTh) return;
            e.preventDefault();
            const touch = e.touches[0];
            const diff = touch.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            currentTh.style.width = newWidth + 'px';
            currentTh.style.minWidth = newWidth + 'px';
        };

        const handleTouchEnd = () => {
            if (isResizing) {
                finishResize();
            }
        };

        const finishResize = () => {
            if (currentTh) {
                resizeHandle.classList.remove('resizing');
                currentTh.classList.remove('resizing');
            }
            isResizing = false;
            currentTh = null;

            // 清理所有事件监听器
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        // 绑定开始事件（支持鼠标和触摸）
        resizeHandle.addEventListener('mousedown', startResize);
        resizeHandle.addEventListener('touchstart', startResize, { passive: false });
    });

    // 优化移动端：减轻滚动冲突
    const tableContainer = table.parentElement;
    if (tableContainer && window.innerWidth <= 768) {
        tableContainer.style.touchAction = 'pan-x pan-y'; // 允许滚动，但优先处理手势
    }
}

// 页面切换函数 - 使用 JS 控制而不是 location.href
function switchPage(page) {
    const urlMap = {
        'index': '/index',
        'area': '/area',
        'arrival': '/arrival'
    };

    if (urlMap[page]) {
        // 保存当前状态
        sessionStorage.setItem('currentPage', page);
        // 使用 location.href 但不会丢失状态
        window.location.href = urlMap[page];
    }
}

// 获取当前页面
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('/area')) return 'area';
    if (path.includes('/arrival')) return 'arrival';
    if (path.includes('/index')) return 'index';
    return 'index';
}

// 优化移动端表格显示
function optimizeMobileTableDisplay() {
    // 检查是否为移动端
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    // 等待DOM完全加载
    setTimeout(() => {
        // 为复选框列添加特殊样式
        const checkboxCols = document.querySelectorAll('.col-checkbox');
        checkboxCols.forEach(col => {
            // 确保复选框列有正确的宽度设置
            col.style.width = '32px';
            col.style.minWidth = '32px';
            col.style.maxWidth = '32px';
            col.style.padding = '0';
            col.style.textAlign = 'center';
        });

        // 为最后一列添加特殊样式
        const lastCols = document.querySelectorAll('th:last-child, td:last-child');
        lastCols.forEach(col => {
            // 确保最后一列有足够的宽度
            col.style.minWidth = '120px';
            col.style.whiteSpace = 'nowrap';
        });

        // 优化复选框本身
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            // 调整复选框大小
            checkbox.style.transform = 'scale(1.2)';
            checkbox.style.margin = '0 auto';
            checkbox.style.display = 'block';
        });
        
        // 优化财务列
        const financialCols = document.querySelectorAll('.financial-column');
        financialCols.forEach(col => {
            // 设置财务列的宽度
            if (window.innerWidth <= 480) {
                col.style.minWidth = '70px';
                col.style.width = '80px';
                col.style.fontSize = '10px';
                col.style.padding = '3px 2px';
            } else {
                col.style.minWidth = '80px';
                col.style.width = '90px';
                col.style.fontSize = '11px';
                col.style.padding = '4px 3px';
            }
            col.style.textAlign = 'right';
        });
    }, 100); // 延迟100ms确保DOM完全渲染
}
