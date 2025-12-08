// 区域管理页面的JavaScript逻辑

let areas = [];
let selectedAreaIds = new Set();

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    const userInfo = getUserInfo();
    if (userInfo) {
        document.getElementById('userName').textContent = userInfo.name;
    }
    loadAreas();
    loadTabsForAreaPage();
});

// 加载所有区域
async function loadAreas() {
    try {
        const response = await apiRequest('/api/areas');
        if (response.code === 0) {
            areas = response.data.list || [];
            renderAreas();
            document.getElementById('totalCount').textContent = response.data.total || 0;
        } else {
            showMessage('加载区域失败: ' + (response.error || '未知错误'), 'error');
        }
    } catch (error) {
        showMessage('加载区域失败: ' + error.message, 'error');
    }
}

// 渲染区域列表
function renderAreas() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!areas || areas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">暂无区域数据</td></tr>';
        return;
    }

    areas.forEach(area => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="row-checkbox" value="${area.id}"
                    onchange="handleRowSelect(${area.id}, this.checked)">
            </td>
            <td>${area.id}</td>
            <td class="editable" data-id="${area.id}" data-field="name" onclick="editCell(event)">${escapeHtml(area.name)}</td>
            <td class="editable" data-id="${area.id}" data-field="description" onclick="editCell(event)">${escapeHtml(area.description || '')}</td>
            <td>${formatDateTime(area.created_at)}</td>
            <td>${formatDateTime(area.updated_at)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateDeleteButton();
}

// 转义HTML特殊字符
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 编辑单元格
function editCell(event) {
    const cell = event.target;
    if (cell.querySelector('input')) return; // 已经在编辑状态

    const areaId = parseInt(cell.dataset.id);
    const field = cell.dataset.field;
    const currentValue = cell.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'cell-input';

    input.onblur = () => saveCellEdit(cell, areaId, field, input.value);
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
}

// 保存单元格编辑
async function saveCellEdit(cell, areaId, field, newValue) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const oldValue = area[field];
    if (newValue === oldValue) {
        cell.textContent = newValue;
        return;
    }

    try {
        const updateData = {
            name: area.name,
            description: area.description || ''
        };
        updateData[field] = newValue;

        const response = await apiRequest(`/api/areas/${areaId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        if (response.code === 0) {
            area[field] = newValue;
            cell.textContent = newValue;
            showMessage('更新成功', 'success');
        } else {
            cell.textContent = oldValue;
            showMessage('更新失败: ' + (response.error || '未知错误'), 'error');
        }
    } catch (error) {
        cell.textContent = oldValue;
        showMessage('更新失败: ' + error.message, 'error');
    }
}

// 新增区域
async function addArea() {
    document.getElementById('addAreaModal').style.display = 'block';
}

// 关闭添加区域模态框
function closeAddAreaModal() {
    document.getElementById('addAreaModal').style.display = 'none';
    document.getElementById('addAreaForm').reset();
}

// 提交添加区域表单
async function submitAddArea(event) {
    event.preventDefault();

    const form = event.target;
    const name = form.name.value.trim();
    const description = form.description.value.trim();

    if (!name) {
        showMessage('请输入区域名称', 'error');
        return;
    }

    try {
        const response = await apiRequest('/api/areas', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        if (response.code === 0) {
            showMessage('创建成功', 'success');
            closeAddAreaModal();
            loadAreas();
            loadTabsForAreaPage();
        } else {
            showMessage('创建失败: ' + (response.error || '未知错误'), 'error');
        }
    } catch (error) {
        showMessage('创建失败: ' + error.message, 'error');
    }
}

// 处理行选择
function handleRowSelect(areaId, checked) {
    if (checked) {
        selectedAreaIds.add(areaId);
    } else {
        selectedAreaIds.delete(areaId);
    }
    updateDeleteButton();
    updateSelectAllCheckbox();
}

// 全选/取消全选
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        const areaId = parseInt(cb.value);
        if (checkbox.checked) {
            selectedAreaIds.add(areaId);
        } else {
            selectedAreaIds.delete(areaId);
        }
    });
    updateDeleteButton();
}

// 更新全选复选框状态
function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.row-checkbox');
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;

    selectAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

// 更新删除按钮状态
function updateDeleteButton() {
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.disabled = selectedAreaIds.size === 0;
}

// 删除选中的区域
async function deleteSelectedAreas() {
    if (selectedAreaIds.size === 0) {
        showMessage('请选择要删除的区域', 'warning');
        return;
    }

    if (!confirm(`确定要删除选中的 ${selectedAreaIds.size} 个区域吗？删除区域后，该区域下的产品将不再关联该区域。`)) {
        return;
    }

    try {
        const deletePromises = Array.from(selectedAreaIds).map(id =>
            apiRequest(`/api/areas/${id}`, { method: 'DELETE' })
        );

        await Promise.all(deletePromises);

        selectedAreaIds.clear();
        showMessage('删除成功', 'success');
        loadAreas();
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// 显示用户信息
function showUserInfo() {
    const userInfo = getUserInfo();
    if (userInfo) {
        document.getElementById('modalUserId').textContent = userInfo.id;
        document.getElementById('modalUserName').textContent = userInfo.name;
        document.getElementById('userModal').style.display = 'block';
    }
}

// 关闭用户信息��态框
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// 退出登录
function logout() {
    clearUserInfo();
    window.location.href = '/login';
}

// 加载区域tabs（用于区域管理页面）
async function loadTabsForAreaPage() {
    try {
        const response = await apiRequest('/api/areas');
        if (response.code === 0) {
            const areas = response.data.list || [];
            const tabItems = document.getElementById('tabItems');
            tabItems.innerHTML = '';

            areas.forEach((area, index) => {
                const tab = document.createElement('button');
                tab.className = 'tab-item';
                tab.textContent = area.name;
                tab.onclick = () => {
                    window.location.href = `/index?area_id=${area.id}`;
                };
                tabItems.appendChild(tab);
            });
        }
    } catch (error) {
        console.error('加载tabs失败:', error);
    }
}

// 点击模态框外部关
window.onclick = function(event) {
    const userModal = document.getElementById('userModal');
    const addAreaModal = document.getElementById('addAreaModal');

    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === addAreaModal) {
        closeAddAreaModal();
    }
};
