// 全局变量
let currentPage = 1;
let pageSize = 200;
let totalPages = 1;
let currentSort = { field: 'id', dir: 'DESC' };
let selectedIds = new Set();
let currentEditingCell = null;
let currentImageArrivalId = null;
let currentKeyword = '';
let startTime = '';
let endTime = '';
let areas = []; // 区域列表

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (!checkLogin()) return;

    const userInfo = getUserInfo();
    document.getElementById('userName').textContent = userInfo.name;

    // 初始化排序点击事件
    initSortable();

    // 初始化列宽调整功能
    initColumnResize('#dataTable');

    // 加载区域tabs
    loadTabs();

    // 加载到货记录列表
    loadArrivals();
});

// 加载区域tabs
async function loadTabs() {
    try {
        const response = await apiRequest('/api/areas');
        if (response.code === 0) {
            areas = response.data.list || [];
            renderTabs();
        }
    } catch (error) {
        console.error('加载区域失败:', error);
    }
}

// 渲染tabs
function renderTabs() {
    const tabItems = document.getElementById('tabItems');
    tabItems.innerHTML = '';

    areas.forEach((area, index) => {
        const tab = document.createElement('button');
        tab.className = 'tab-item';
        tab.textContent = area.name;
        tab.onclick = () => switchToProductArea(area.id);
        tabItems.appendChild(tab);
    });
}

// 切换到产品区域
function switchToProductArea(areaId) {
    window.location.href = `/index?area_id=${areaId}`;
}

// 初始化排序功能
function initSortable() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const field = this.dataset.field;
            if (currentSort.field === field) {
                currentSort.dir = currentSort.dir === 'ASC' ? 'DESC' : 'ASC';
            } else {
                currentSort.field = field;
                currentSort.dir = 'DESC';
            }

            // 更新排序图标
            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            this.classList.add(currentSort.dir.toLowerCase());

            // 重新加载数据
            currentPage = 1;
            loadArrivals();
        });
    });
}

// 加载到货记录列表
async function loadArrivals() {
    try {
        let url = `/api/arrivals?page=${currentPage}&page_size=${pageSize}&order_by=${currentSort.field}&order_dir=${currentSort.dir}`;

        if (currentKeyword) {
            url += `&keyword=${encodeURIComponent(currentKeyword)}`;
        }
        if (startTime) {
            url += `&start_time=${encodeURIComponent(startTime)}`;
        }
        if (endTime) {
            url += `&end_time=${encodeURIComponent(endTime)}`;
        }

        const data = await apiRequest(url, { method: 'GET' });

        if (data.code === 0) {
            renderArrivals(data.data);
            updatePagination(data.data);
        }
    } catch (error) {
        showMessage('加载数据失败: ' + error.message, 'error');
    }
}

// 渲染到货记录列表
function renderArrivals(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data.list || data.list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;">暂无数据</td></tr>';
        return;
    }

    data.list.forEach(arrival => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="row-checkbox" value="${arrival.id}"
                    onchange="toggleRowSelect(this)" ${selectedIds.has(arrival.id) ? 'checked' : ''}>
            </td>
            <td>${arrival.id}</td>
            <td class="col-photo" ondrop="dropImage(event,${arrival.id})" ondragover="allowDrop(event)">
                ${arrival.arrival_photo ?
                    `<img src="${arrival.arrival_photo}?w=300&h=300" class="product-image" onclick="viewImage('${arrival.arrival_photo}', ${arrival.id})">` :
                    `<div class="product-image placeholder" onclick="uploadImageForArrival(${arrival.id})">点击上传</div>`
                }
            </td>
            <td class="editable-cell" onclick="editCell(this, ${arrival.id}, 'quantity')">${arrival.quantity || ''}</td>
            <td class="editable-cell" onclick="editCell(this, ${arrival.id}, 'brand')">${arrival.brand || ''}</td>
            <td class="editable-cell" onclick="editCell(this, ${arrival.id}, 'box_number')">${arrival.box_number || ''}</td>
            <td class="editable-cell" onclick="editCell(this, ${arrival.id}, 'arrival_date')">${arrival.arrival_date || ''}</td>
            <td class="editable-cell" onclick="editCell(this, ${arrival.id}, 'confirm_person')">${arrival.confirm_person || ''}</td>
            <td>${formatDateTime(arrival.updated_at)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 更新分页信息
function updatePagination(data) {
    document.getElementById('totalCount').textContent = data.total;
    document.getElementById('totalCountInPagination').textContent = data.total;
    totalPages = Math.ceil(data.total / data.page_size);
    document.getElementById('totalPagesText').textContent = totalPages;

    document.getElementById('prevBtn').disabled = data.page <= 1;
    document.getElementById('nextBtn').disabled = data.page >= totalPages;

    // 生成页码
    renderPageNumbers(data.page, totalPages);
}

// 渲染页码
function renderPageNumbers(current, total) {
    const container = document.getElementById('pageNumbers');
    container.innerHTML = '';

    if (total <= 1) {
        return;
    }

    // 计算要显示的页码范围
    let pages = [];

    if (total <= 7) {
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        if (current <= 4) {
            pages = [1, 2, 3, 4, 5, '...', total];
        } else if (current >= total - 3) {
            pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
        } else {
            pages = [1, '...', current - 1, current, current + 1, '...', total];
        }
    }

    // 渲染页码
    pages.forEach(page => {
        if (page === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        } else {
            const pageBtn = document.createElement('div');
            pageBtn.className = 'page-number';
            if (page === current) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = page;
            pageBtn.onclick = () => goToPage(page);
            container.appendChild(pageBtn);
        }
    });
}

// 跳转到指定页
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    currentPage = page;
    loadArrivals();
}

// 编辑单元格
function editCell(cell, arrivalId, field) {
    if (cell.querySelector('input') || cell.querySelector('textarea')) {
        return;
    }

    if (currentEditingCell) {
        currentEditingCell.isEditing = false;
    }

    const currentValue = cell.textContent.trim();
    const input = document.createElement('input');
    input.value = currentValue;
    input.className = 'cell-input';
    input.type = 'text';

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    currentEditingCell = { cell, arrivalId, field, originalValue: currentValue };

    const saveEdit = async () => {
        const newValue = input.value.trim();
        if (newValue === currentValue) {
            cell.textContent = currentValue;
            currentEditingCell = null;
            return;
        }

        try {
            const data = await apiRequest(`/api/arrivals/${arrivalId}/field`, {
                method: 'PATCH',
                body: JSON.stringify({ field, value: newValue })
            });

            if (data.code === 0) {
                showMessage('保存成功', 'success');
                cell.textContent = newValue;
            }
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
            cell.textContent = currentValue;
        }

        currentEditingCell = null;
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cell.textContent = currentValue;
            currentEditingCell = null;
        }
    });
}

// 查看图片
function viewImage(imageUrl, arrivalId) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl;
    currentImageArrivalId = arrivalId;
    modal.style.display = 'block';
}

// 关闭图片模态框
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    currentImageArrivalId = null;
}

// 修改图片
function changeImage() {
    document.getElementById('imageUpload').click();
}

// 上传新图片
async function uploadNewImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        showMessage('上传中...', 'info');
        const url = await uploadImage(file);

        const data = await apiRequest(`/api/arrivals/${currentImageArrivalId}/field`, {
            method: 'PATCH',
            body: JSON.stringify({
                field: 'arrival_photo',
                value: url
            })
        });

        if (data.code === 0) {
            showMessage('上传成功', 'success');
            closeImageModal();
            loadArrivals();
        }
    } catch (error) {
        showMessage('上传失败: ' + error.message, 'error');
    }

    fileInput.value = '';
}

// Enable drop event on the photo cell
function allowDrop(event) {
    event.preventDefault();
}

async function fetchImageAsFile(url) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], "image.jpg", { type: blob.type });
        return file;
    } catch (e) {
        console.error("无法读取拖拽图片", e);
        return null;
    }
}

async function dropImage(event, arrivalId) {
    event.preventDefault();

    const dt = event.dataTransfer;

    // 1) 先处理本地文件
    if (dt.files.length > 0 && dt.files[0].type.startsWith('image/')) {
        await uploadImageForArrivalFromFile(dt.files[0], arrivalId);
        return;
    }

    // 2) 处理拖拽网页图片
    for (const item of dt.items) {
        if (item.kind === 'string' && (item.type === 'text/uri-list' || item.type === 'text/plain')) {
            item.getAsString(async (url) => {
                const file = await fetchImageAsFile(url);
                if (file) {
                    await uploadImageForArrivalFromFile(file, arrivalId);
                }
            });
            return;
        }

        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && file.type.startsWith('image/')) {
                await uploadImageForArrivalFromFile(file, arrivalId);
                return;
            }
            if (file && file.type === "") {
                const fixedFile = await fixFileType(file);
                await uploadImageForArrivalFromFile(fixedFile, arrivalId);
                return;
            }
        }
    }
}

async function fixFileType(file) {
    if (file.type) return file;

    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);

    let type = "image/jpeg";

    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        type = "image/png";
    } else if (bytes[0] === 0x47 && bytes[1] === 0x49) {
        type = "image/gif";
    } else if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF") {
        type = "image/webp";
    }

    return new File([buf], file.name || "drag-image.jpg", { type });
}

async function uploadImageForArrivalFromFile(file, arrivalId) {
    if (!file) return;

    try {
        showMessage('上传中...', 'info');
        const url = await uploadImage(file);

        const data = await apiRequest(`/api/arrivals/${arrivalId}/field`, {
            method: 'PATCH',
            body: JSON.stringify({ field: 'arrival_photo', value: url })
        });

        if (data.code === 0) {
            showMessage('上传成功', 'success');
            loadArrivals();
        }
    } catch (error) {
        showMessage('上传失败: ' + error.message, 'error');
    }
}

// 为到货记录上传图片
async function uploadImageForArrival(arrivalId) {
    currentImageArrivalId = arrivalId;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showMessage('上传中...', 'info');
            const url = await uploadImage(file);

            const data = await apiRequest(`/api/arrivals/${arrivalId}/field`, {
                method: 'PATCH',
                body: JSON.stringify({ field: 'arrival_photo', value: url })
            });

            if (data.code === 0) {
                showMessage('上传成功', 'success');
                loadArrivals();
            }
        } catch (error) {
            showMessage('上传失败: ' + error.message, 'error');
        }
    };
    input.click();
}

// 添加新到货记录
async function addArrival() {
    try {
        const data = await apiRequest('/api/arrivals', {
            method: 'POST',
            body: JSON.stringify({
                arrival_photo: '',
                quantity: '',
                brand: '',
                box_number: '',
                arrival_date: '',
                confirm_person: ''
            })
        });

        if (data.code === 0) {
            showMessage('添加成功', 'success');
            currentPage = 1;
            loadArrivals();
        }
    } catch (error) {
        showMessage('添加失败: ' + error.message, 'error');
    }
}

// 切换行选择
function toggleRowSelect(checkbox) {
    const id = parseInt(checkbox.value);
    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
    }
    updateDeleteButton();
}

// 切换全选
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        toggleRowSelect(cb);
    });
}

// 更新删除按钮状态
function updateDeleteButton() {
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.disabled = selectedIds.size === 0;
}

// 删除选中的记录
async function deleteSelected() {
    const userInfo = getUserInfo();
    const isAdmin = userInfo.user_id === 1;
    if (!isAdmin) {
         showMessage('你没有删除权限', 'error');
         return;
    }
    if (selectedIds.size === 0) {
        showMessage('请先选择要删除的数据', 'error');
        return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条数据吗？`)) {
        return;
    }

    try {
        const data = await apiRequest('/api/arrivals/delete', {
            method: 'POST',
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (data.code === 0) {
            showMessage('删除成功', 'success');
            selectedIds.clear();
            document.getElementById('selectAll').checked = false;
            updateDeleteButton();
            loadArrivals();
        }
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadArrivals();
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadArrivals();
    }
}

// 显示用户信息
function showUserInfo() {
    const userInfo = getUserInfo();
    document.getElementById('userIdDisplay').textContent = userInfo.user_id;
    document.getElementById('userNameDisplay').textContent = userInfo.name;
    document.getElementById('userModal').style.display = 'block';
}

// 关闭用户信息模态框
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// 退出登录
function logout() {
    if (confirm('确定要退出系统吗？')) {
        clearUserInfo();
        window.location.href = '/login';
    }
}

// 处理查询
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    const keyword = searchInput.value.trim();
    const start = startTimeInput.value;
    const end = endTimeInput.value;

    currentKeyword = keyword;
    startTime = start;
    endTime = end;
    currentPage = 1;
    selectedIds.clear();
    document.getElementById('selectAll').checked = false;
    updateDeleteButton();

    loadArrivals();

    let message = '';
    if (keyword) message += '关键字: ' + keyword;
    if (start) message += (message ? ', ' : '') + '开始时间: ' + start;
    if (end) message += (message ? ', ' : '') + '结束时间: ' + end;

    if (message) {
        showMessage('查询条件: ' + message, 'info');
    }
}

// 处理搜索框回车键
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        handleSearch();
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const imageModal = document.getElementById('imageModal');
    const userModal = document.getElementById('userModal');

    if (event.target === imageModal) {
        closeImageModal();
    }
    if (event.target === userModal) {
        closeUserModal();
    }
}
