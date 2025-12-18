// 全局变量
let currentPage = 1;
let pageSize = 500;
let totalPages = 1;
let currentSort = { field: 'id', dir: 'DESC' };
let selectedIds = new Set();
let currentEditingCell = null;
let currentImageField = null;
let currentImageProductId = null;
let currentKeyword = '';
let startTime = '';
let endTime = '';
let currentAreaId = null; // 当前选中的区域ID
let areas = []; // 区域列表

// 从尺码字符串中提取件数
function extractQuantity(sizeStr) {
    if (!sizeStr) return 0;

    // 中文数字映射
    const chineseNumbers = {
        '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };

    // 匹配模式：数字+件 或 中文数字+件
    const patterns = [
        /(\d+)\s*件/g,           // 匹配 "3件" "10件"
        /(零|一|二|两|三|四|五|六|七|八|九|十)\s*件/g  // 匹配 "两件" "三件"
    ];

    let totalQuantity = 0;

    // 尝试匹配数字+件
    const numberMatches = sizeStr.matchAll(patterns[0]);
    for (const match of numberMatches) {
        totalQuantity += parseInt(match[1], 10);
    }

    // 尝试匹配中文数字+件
    const chineseMatches = sizeStr.matchAll(patterns[1]);
    for (const match of chineseMatches) {
        const chineseNum = match[1];
        if (chineseNumbers.hasOwnProperty(chineseNum)) {
            totalQuantity += chineseNumbers[chineseNum];
        }
    }

    return totalQuantity;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkLogin()) return;

    const userInfo = getUserInfo();
    document.getElementById('userName').textContent = userInfo.name;

    // 如果不是管理员用户(ID=1)，隐藏财务相关列
    if (userInfo.user_id !== 1) {
        hideFinancialColumns();
    }

    // 从URL参数获取区域ID
    const urlParams = new URLSearchParams(window.location.search);
    const areaIdParam = urlParams.get('area_id');
    if (areaIdParam) {
        currentAreaId = parseInt(areaIdParam);
    }

    // 初始化排序点击事件
    initSortable();

    // 初始化列宽调整功能
    initColumnResize('#dataTable');

    // 加载区域tabs并等待完成（重要：必须先加载区域再加载产品）
    await loadTabs();

    // 加载产品列表
    loadProducts();

    // 页面加载完成后再次优化移动端显示（确保样式正确应用）
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            if (typeof optimizeMobileTableDisplay === 'function') {
                optimizeMobileTableDisplay();
            }
        }, 500);
    }
});

// 隐藏财务相关列
function hideFinancialColumns() {
    const style = document.createElement('style');
    style.textContent = '.financial-column { display: none !important; }';
    document.head.appendChild(style);
}

// 加载区域tabs
async function loadTabs() {
    try {
        const response = await apiRequest('/api/areas');
        if (response.code === 0) {
            areas = response.data.list || [];

            // 如果没有区域，跳转到到货图区域
            if (!areas || areas.length === 0) {
                showMessage('请先创建区域或访问到货图区域', 'info');
                window.location.href = '/arrival';
                return;
            }

            renderTabs();
        }
    } catch (error) {
        console.error('加载区域失败:', error);
        // 加载失败时也设置默认区域，避免后续出错
        if (areas && areas.length > 0 && !currentAreaId) {
            currentAreaId = areas[0].id;
        }
    }
}

// 渲染tabs
function renderTabs() {
    const tabItems = document.getElementById('tabItems');
    tabItems.innerHTML = '';

    // 如果没有选中任何区域且存在区域，默认选中第一个
    if (!currentAreaId && areas.length > 0) {
        currentAreaId = areas[0].id;
    }

    areas.forEach((area, index) => {
        const tab = document.createElement('button');
        tab.className = 'tab-item';
        if (currentAreaId === area.id) {
            tab.classList.add('active');
        }
        tab.textContent = area.name;
        tab.onclick = () => switchArea(area.id);
        tabItems.appendChild(tab);
    });
}

// 切换区域
function switchArea(areaId) {
    currentAreaId = areaId;
    currentPage = 1; // 切换区域时重置页码
    selectedIds.clear(); // 清空选中项
    loadProducts(); // 重新加载产品
    renderTabs(); // 更新tab状态
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
            loadProducts();
        });
    });
}

// 加载产品列表
async function loadProducts() {
    try {
        let url = `/api/products?page=${currentPage}&page_size=${pageSize}&order_by=${currentSort.field}&order_dir=${currentSort.dir}`;

        // 添加区域过滤
        if (currentAreaId) {
            url += `&area_id=${currentAreaId}`;
        }

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
            renderProducts(data.data);
            renderSummary(data.data.summary);
            updatePagination(data.data);
        }
    } catch (error) {
        showMessage('加载数据失败: ' + error.message, 'error');
    }
}

// 渲染产品列表
function renderProducts(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data.list || data.list.length === 0) {
        const userInfo = getUserInfo();
        const colspan = userInfo.user_id === 1 ? '17' : '10';
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:40px;">暂无数据</td></tr>`;
        return;
    }

    const userInfo = getUserInfo();
    const isAdmin = userInfo.user_id === 1;

    data.list.forEach(product => {
        const tr = document.createElement('tr');

        let html = `
            <td class="col-checkbox">
                <input type="checkbox" class="row-checkbox" value="${product.id}"
                    onchange="toggleRowSelect(this)" ${selectedIds.has(product.id) ? 'checked' : ''}>
            </td>
            <td class="calculated-cell">${product.sid}</td>
            <td class="col-photo" ondrop="dropImage(event,${product.id}, 'photo')" ondragover="allowDrop(event)">
                ${product.photo ?
                    `<img src="${product.photo}?w=300&h=300" class="product-image" onclick="viewImage('${product.photo}', ${product.id}, 'photo')">` :
                    `<div class="product-image placeholder" onclick="uploadImageForProduct(${product.id}, 'photo')">点击上传</div>`
                }
            </td>`;
         if (isAdmin) {
            html +=  `<td class="editable-cell" onclick="editCell(this, ${product.id}, 'customer_name')" >${product.customer_name || ''}</td>
                <td class="editable-cell" onclick="editCell(this, ${product.id}, 'brand')" >${product.brand || ''}</td>
                <td class="editable-cell" onclick="editCell(this, ${product.id}, 'size')">${product.size || ''}</td>
                <td class="calculated-cell">${product.quantity || 0}件</td>
                <td class="editable-cell" onclick="editCell(this, ${product.id}, 'address')">${product.address || ''}</td>
                <td class="editable-cell" onclick="editCell(this, ${product.id}, 'mark')">${product.mark || ''}</td>
                <td class="col-photo" ondrop="dropImage(event,${product.id}, 'status_note_photo')" ondragover="allowDrop(event)">
                    ${product.status_note_photo ?
                        `<img src="${product.status_note_photo}?w=300&h=300" class="product-image" onclick="viewImage('${product.status_note_photo}', ${product.id}, 'status_note_photo')">` :
                        `<div class="product-image placeholder" onclick="uploadImageForProduct(${product.id}, 'status_note_photo')">点击上传</div>`
                    }
                </td>
                <td>${formatDateTime(product.updated_at)}</td>`;
         }else{
             html +=  `<td >${product.customer_name || ''}</td>
                <td >${product.brand || ''}</td>
                <td >${product.size || ''}</td>
                <td class="calculated-cell">${product.quantity || 0}件</td>
                <td >${product.address || ''}</td>
                <td class="editable-cell" onclick="editCell(this, ${product.id}, 'mark')">${product.mark || ''}</td>
                <td class="col-photo" ondrop="dropImage(event,${product.id}, 'status_note_photo')" ondragover="allowDrop(event)">
                    ${product.status_note_photo ?
                        `<img src="${product.status_note_photo}?w=300&h=300" class="product-image" onclick="viewImage('${product.status_note_photo}', ${product.id}, 'status_note_photo')">` :
                        `<div class="product-image placeholder" onclick="uploadImageForProduct(${product.id}, 'status_note_photo')">点击上传</div>`
                    }
                </td>
                <td>${formatDateTime(product.updated_at)}</td>`;
         }
           
        // 只有管理员才显示财务相关列
        if (isAdmin) {
            html += `
            <td class="editable-cell financial-column" onclick="editCell(this, ${product.id}, 'cost_eur')">${formatNumber(product.cost_eur)}</td>
            <td class="editable-cell financial-column" onclick="editCell(this, ${product.id}, 'exchange_rate')">${formatNumber(product.exchange_rate, 4)}</td>
            <td class="calculated-cell financial-column">${formatNumber(product.cost_rmb)}</td>
            <td class="editable-cell financial-column" onclick="editCell(this, ${product.id}, 'price_rmb')">${formatNumber(product.price_rmb)}</td>
            <td class="editable-cell financial-column" onclick="editCell(this, ${product.id}, 'shipping_fee')">${formatNumber(product.shipping_fee)}</td>
            <td class="calculated-cell financial-column">${formatNumber(product.total_cost)}</td>
            <td class="calculated-cell financial-column">${formatNumber(product.profit)}</td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// 渲染汇总行
function renderSummary(summary) {
    const userInfo = getUserInfo();
    const isAdmin = userInfo.user_id === 1;

    const tfoot = document.getElementById('tableFoot');

    if (isAdmin) {
        tfoot.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:right;"><strong>汇总:</strong></td>
                <td colspan="1"></td>
                <td><strong>${summary.total_quantity || 0}件</strong></td>
                <td colspan="4"></td>
                <td class="financial-column"><strong>${formatNumber(summary.total_cost_eur)}</strong></td>
                <td class="financial-column">-</td>
                <td class="financial-column"><strong>${formatNumber(summary.total_cost_rmb)}</strong></td>
                <td class="financial-column"><strong>${formatNumber(summary.total_price_rmb)}</strong></td>
                <td class="financial-column"><strong>${formatNumber(summary.total_shipping_fee)}</strong></td>
                <td class="financial-column"><strong>${formatNumber(summary.total_cost)}</strong></td>
                <td class="financial-column"><strong>${formatNumber(summary.total_profit)}</strong></td>
            </tr>
        `;
    } 
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
        // 总页数少于等于7，显示所有页码
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // 总页数大于7，智能显示
        if (current <= 4) {
            // 当前页靠前
            pages = [1, 2, 3, 4, 5, '...', total];
        } else if (current >= total - 3) {
            // 当前页靠后
            pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
        } else {
            // 当前页在中间
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
    loadProducts();
}


// 编辑单元格
function editCell(cell, productId, field) {
    // 如果单元格已经在编辑状态，不再处理
    if (cell.querySelector('input') || cell.querySelector('textarea')) {
        return;
    }

    if (currentEditingCell) {
        currentEditingCell.isEditing = false;
    }

    const currentValue = cell.textContent.trim();
    const isTextarea = field === 'address' || field === 'size' || field === 'mark';

    const input = document.createElement(isTextarea ? 'textarea' : 'input');
    input.value = currentValue;
    input.className = 'cell-input';
    if (!isTextarea) {
        input.type = 'text';
    }

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    if (!isTextarea) {
        input.select();
    }

    currentEditingCell = { cell, productId, field, originalValue: currentValue };

    const saveEdit = async () => {
        const newValue = input.value.trim();
        if (newValue === currentValue) {
            cell.textContent = currentValue;
            currentEditingCell = null;
            return;
        }

        try {
            let value = newValue;
            if (['cost_eur', 'exchange_rate', 'price_rmb', 'shipping_fee'].includes(field)) {
                value = parseFloat(newValue) || 0;
            }

            const data = await apiRequest(`/api/products/${productId}/field`, {
                method: 'PATCH',
                body: JSON.stringify({ field, value })
            });

            if (data.code === 0) {
                showMessage('保存成功', 'success');
                // 更新当前行的计算字段
                updateCalculatedFields(cell.parentElement, data.data);
                loadProducts(); // 重新加载以更新汇总
            }
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
            cell.textContent = currentValue;
        }

        currentEditingCell = null;
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isTextarea) {
            saveEdit();
        } else if (e.key === 'Escape') {
            cell.textContent = currentValue;
            currentEditingCell = null;
        }
    });
}

// 更新计算字段
function updateCalculatedFields(row, product) {
    const userInfo = getUserInfo();
    const isAdmin = userInfo.user_id === 1;

    const cells = row.querySelectorAll('td');

    if (isAdmin) {
        // 管理员可以看到所有字段
        cells[5].textContent = `${product.quantity || 0}件`; // 件数

        // 查找财务相关的单元格（需要考虑它们的位置）
        const financialCells = row.querySelectorAll('.financial-column');
        if (financialCells.length >= 7) {
            financialCells[2].textContent = formatNumber(product.cost_rmb); // 成本RMB
            financialCells[5].textContent = formatNumber(product.total_cost); // 总成本
            financialCells[6].textContent = formatNumber(product.profit); // 净利润
        }
    } else {
        // 普通用户只更新件数
        cells[5].textContent = `${product.quantity || 0}件`; // 件数
    }
}

// 查看图片
function viewImage(imageUrl, productId, field) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl;
    currentImageProductId = productId;
    currentImageField = field;
    modal.style.display = 'block';
}

// 关闭图片模态框
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    currentImageProductId = null;
    currentImageField = null;
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

        const data = await apiRequest(`/api/products/${currentImageProductId}/field`, {
            method: 'PATCH',
            body: JSON.stringify({
                field: currentImageField,
                value: url
            })
        });

        if (data.code === 0) {
            showMessage('上传成功', 'success');
            closeImageModal();
            loadProducts();
        }
    } catch (error) {
        showMessage('上传失败: ' + error.message, 'error');
    }

    fileInput.value = '';
}

// Enable drop event on the photo cell
function allowDrop(event) {
    event.preventDefault();  // Prevent the default handling of the event (e.g., opening the file)
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

async function dropImage(event, productId, field) {
    event.preventDefault();

    const dt = event.dataTransfer;

    // 1) 先处理本地文件
    if (dt.files.length > 0 && dt.files[0].type.startsWith('image/')) {
        await uploadImageForProductFromFile(dt.files[0], productId, field);
        return;
    }

    // 2) 处理拖拽网页图片（朋友圈 / 浏览器图片）
    for (const item of dt.items) {
        if (item.kind === 'string' && (item.type === 'text/uri-list' || item.type === 'text/plain')) {
            item.getAsString(async (url) => {
                // 下载图片并转成 File 再上传
                const file = await fetchImageAsFile(url);
                if (file) {
                    await uploadImageForProductFromFile(file, productId, field);
                }
            });
            return;
        }

        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && file.type.startsWith('image/')) {
                await uploadImageForProductFromFile(file, productId, field);
                return;
            }
            if (file && file.type === "") {
                const fixedFile = await fixFileType(file);
                await uploadImageForProductFromFile(fixedFile, productId, field);
                return;
            }
        }
    }
}

async function fixFileType(file) {
    if (file.type) return file; // 正常图片不处理

    const buf = await file.arrayBuffer();

    // 尝试判断真实图片格式（JPEG/PNG/GIF/WebP）
    const bytes = new Uint8Array(buf);

    let type = "image/jpeg"; // 默认 JPEG（朋友圈大部分是这个）

    // PNG signature
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        type = "image/png";
    }
    // GIF signature
    else if (bytes[0] === 0x47 && bytes[1] === 0x49) {
        type = "image/gif";
    }
    // WebP header
    else if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF") {
        type = "image/webp";
    }

    return new File([buf], file.name || "drag-image.jpg", { type });
}

async function uploadImageForProductFromFile(file, productId, field) {
    if (!file) return;

    try {
        showMessage('上传中...', 'info');
        const url = await uploadImage(file);

        // Send the image URL to the server and associate it with the product's field
        const data = await apiRequest(`/api/products/${productId}/field`, {
            method: 'PATCH',
            body: JSON.stringify({ field: field, value: url })
        });

        if (data.code === 0) {
            showMessage('上传成功', 'success');
            loadProducts();  // Reload or update products list
        }
    } catch (error) {
        showMessage('上传失败: ' + error.message, 'error');
    }
}


// 为产品上传图片
async function uploadImageForProduct(productId, field) {
    currentImageProductId = productId;
    currentImageField = field;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showMessage('上传中...', 'info');
            const url = await uploadImage(file);

            const data = await apiRequest(`/api/products/${productId}/field`, {
                method: 'PATCH',
                body: JSON.stringify({ field, value: url })
            });

            if (data.code === 0) {
                showMessage('上传成功', 'success');
                loadProducts();
            }
        } catch (error) {
            showMessage('上传失败: ' + error.message, 'error');
        }
    };
    input.click();
}

// 添加新产品
async function addProduct() {
    // 检查是否有区域
    if (!areas || areas.length === 0) {
        showMessage('请先创建区域后再添加产品', 'error');
        return;
    }

    // 检查是否选择了区域
    if (!currentAreaId) {
        showMessage('请先选择一个区域', 'error');
        return;
    }

    try {
        const data = await apiRequest('/api/products', {
            method: 'POST',
            body: JSON.stringify({
                area_id: currentAreaId,
                customer_name: '',
                brand: '',
                size: '',
                address: '',
                mark: '',
                cost_eur: 0,
                exchange_rate: 0,
                price_rmb: 0,
                shipping_fee: 0
            })
        });

        if (data.code === 0) {
            showMessage('添加成功', 'success');
            currentPage = 1;
            loadProducts();
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

// 删除选中的产品
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
        const data = await apiRequest('/api/products/delete', {
            method: 'POST',
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (data.code === 0) {
            showMessage('删除成功', 'success');
            selectedIds.clear();
            document.getElementById('selectAll').checked = false;
            updateDeleteButton();
            loadProducts();
        }
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadProducts();
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadProducts();
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
    currentPage = 1; // 重置到第一页
    selectedIds.clear();
    document.getElementById('selectAll').checked = false;
    updateDeleteButton();

    loadProducts();

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
