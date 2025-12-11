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
`;
document.head.appendChild(style);

// 初始化表格列宽调整功能
function initColumnResize(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const thead = table.querySelector('thead');
    if (!thead) return;

    const ths = thead.querySelectorAll('th');

    ths.forEach((th, index) => {
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

        let startX = 0;
        let startWidth = 0;
        let currentTh = null;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            currentTh = th;
            startX = e.pageX;
            startWidth = th.offsetWidth;

            resizeHandle.classList.add('resizing');
            th.classList.add('resizing');

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        function handleMouseMove(e) {
            if (!currentTh) return;

            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); // 最小宽度 50px
            currentTh.style.width = newWidth + 'px';
            currentTh.style.minWidth = newWidth + 'px';
        }

        function handleMouseUp() {
            if (currentTh) {
                resizeHandle.classList.remove('resizing');
                currentTh.classList.remove('resizing');
                currentTh = null;
            }

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    });
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
