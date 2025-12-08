document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    // 检查是否已登录
    if (getUserInfo()) {
        window.location.href = '/index';
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            errorMessage.textContent = '请输入用户名和密码';
            return;
        }

        try {
            const data = await apiRequest('/api/login', {
                method: 'POST',
                body: JSON.stringify({
                    name: username,
                    pwd: password
                })
            });

            if (data.code === 0) {
                saveUserInfo(data.data);
                window.location.href = '/index';
            } else {
                errorMessage.textContent = data.message || '登录失败';
            }
        } catch (error) {
            errorMessage.textContent = error.message || '登录失败，请稍后重试';
        }
    });
});
