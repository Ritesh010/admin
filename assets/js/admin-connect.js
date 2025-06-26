// ============================================================================
// AUTHENTICATION & INITIALIZATION
// ============================================================================

// Initialize application based on authentication status and page
if ("adminToken" in sessionStorage) {
    initializeAuthenticatedApp();
} else {
    handleUnauthenticatedUser();
}

function initializeAuthenticatedApp() {
    const pageInitializers = {
        "Admin Dashboard": renderDashboard,
        "Orders List": renderOrders,
        "Product List": renderProducts,
        "Product Edit": getProduct
    };

    const initializer = pageInitializers[document.title];
    if (initializer) {
        window.onload = initializer;
    }
}

function handleUnauthenticatedUser() {
    if (!document.title.includes('Signin')) {
        alert("Session expired. Please log in again.");
        sessionStorage.clear();
        window.location.replace("auth-signin.html");
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function adminLogin(event) {
    event.preventDefault();

    const email = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    if (!email || !password) {
        alert('Please enter both username and password.');
        return;
    }

    try {
        console.log("Attempting admin login...");

        const response = await fetch('https://api.thebirdcart.com/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: email,
                password: password
            })
        });

        if (!response.ok) {
            alert('Invalid credentials. Please try again.');
            throw new Error("Authentication failed");
        }

        const result = await response.json();
        console.log("Login response:", result);

        if (result.message === 'Admin login successful') {
            // Store authentication data
            sessionStorage.setItem('adminToken', result.adminToken);
            sessionStorage.setItem('firstName', result.admin.first_name);
            sessionStorage.setItem('lastName', result.admin.last_name);
            sessionStorage.setItem('username', result.admin.username);

            alert('Login successful! Redirecting to dashboard...');
            window.location.href = 'index.html';
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}
function logout(event) {
    event.preventDefault();
    sessionStorage.clear();
}
async function changePassword(event) {
    event.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('reNewPassword').value;

    const res = await fetch('https://api.thebirdcart.com/api/admin/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
    });

    const data = await res.json();
    if (res.ok) {
        alert(data.message);
        document.getElementById('closeModal').click();
    } else {
        alert(data.error);
    }
}


// ============================================================================
// DASHBOARD FUNCTIONALITY
// ============================================================================

async function getDashboard(adminToken) {
    try {
        const response = await fetch('https://api.thebirdcart.com/api/admin/dashboard/overview', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        return await response.json();
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        alert('Failed to load dashboard data. Please refresh the page.');
        throw error;
    }
}

async function renderDashboard() {
    try {
        const adminToken = sessionStorage.getItem('adminToken');
        const data = await getDashboard(adminToken);

        console.log("Dashboard data:", data);
        updateDOMFromData(data);

        const recentOrdersBody = document.getElementById('recent-orders-body');
        if (recentOrdersBody && data.recent_orders) {
            data.recent_orders.forEach(order => {
                const row = createOrderRow(order);
                recentOrdersBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Dashboard render error:', error);
    }
}

function updateDOMFromData(obj, prefix = '') {
    for (const key in obj) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            updateDOMFromData(value, fullKey);
        } else {
            const element = document.getElementById(fullKey);
            if (element) {
                element.textContent = value;
            }
        }
    }
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

function createOrderRow(orderData) {
    const row = document.createElement('tr');

    // Order Number Cell
    const orderNumberCell = document.createElement('td');
    orderNumberCell.textContent = orderData.order_number;

    // Order Date Cell
    const orderDateCell = document.createElement('td');
    orderDateCell.textContent = formatDateTime(orderData.created_at);

    // Total Amount Cell
    const totalAmtCell = document.createElement('td');
    totalAmtCell.textContent = `$${parseFloat(orderData.total_amount).toFixed(2)}`;

    // Customer Name Cell
    const customerNameCell = document.createElement('td');
    customerNameCell.textContent = `${orderData.first_name} ${orderData.last_name}`;

    // Customer Email Cell
    const customerEmailCell = document.createElement('td');
    customerEmailCell.textContent = orderData.email;

    // Customer Phone Cell
    const customerPhoneCell = document.createElement('td');
    customerPhoneCell.textContent = orderData.phone || 'N/A';

    // Customer Address Cell
    const customerAddressCell = document.createElement('td');
    customerAddressCell.textContent = orderData.shipping_address;

    // Payment Method Cell
    const paymentMethodCell = document.createElement('td');
    paymentMethodCell.textContent = orderData.payment_method;

    // Action Button Cell
    // const actionCell = document.createElement('td');
    // const actionButton = document.createElement('button');
    // actionButton.type = 'button';
    // actionButton.classList.add('btn', 'btn-info', 'btn-sm');
    // actionButton.textContent = 'Generate';
    // actionCell.appendChild(actionButton);

    // Order Status Cell
    const statusCell = document.createElement('td');
    const statusIcon = document.createElement('i');
    statusIcon.classList.add('bx', 'bxs-circle', 'text-success', 'me-1');
    statusCell.appendChild(statusIcon);
    statusCell.appendChild(document.createTextNode(orderData.status));

    // Append all cells to row
    [orderNumberCell, orderDateCell, totalAmtCell, customerNameCell,
        customerEmailCell, customerPhoneCell, customerAddressCell,
        paymentMethodCell, actionCell, statusCell].forEach(cell => {
            row.appendChild(cell);
        });

    return row;
}

async function getOrders(adminToken) {
    try {
        const response = await fetch('https://api.thebirdcart.com/api/orders/admin/all', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        return await response.json();
    } catch (error) {
        console.error('Orders fetch error:', error);
        alert('Failed to load orders. Please refresh the page.');
        throw error;
    }
}

async function renderOrders() {
    try {
        const adminToken = sessionStorage.getItem('adminToken');
        const [ordersData, analyticsData] = await Promise.all([
            getOrders(adminToken),
            getAnalytics(adminToken),
        ]);

        console.log("Analytics data:", analyticsData);
        updateDOMFromData(analyticsData);

        const ordersBody = document.getElementById('all-orders-body');
        if (ordersBody && ordersData.orders) {
            ordersData.orders.forEach(order => {
                const row = createAllOrderRow(order);
                ordersBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Orders render error:', error);
    }
}

function createAllOrderRow(orderData) {
    const row = document.createElement('tr');
    const detailRow = document.createElement('tr');
    detailRow.style.display = 'none';

    const detailCell = document.createElement('td');
    detailCell.colSpan = 12;
    detailCell.innerHTML = createDetailRowHTML(orderData);
    detailRow.appendChild(detailCell);

    // Create main row cells
    const cells = [
        createOrderNumberCell(orderData),
        createOrderDateCell(orderData),
        createItemsCell(orderData, detailRow),
        createCustomerNameCell(orderData),
        createCustomerEmailCell(orderData),
        createCustomerPhoneCell(orderData),
        createCustomerAddressCell(orderData),
        createPaymentMethodCell(orderData),
        createActionCell(orderData),
        createStatusCell(orderData)
    ];

    cells.forEach(cell => row.appendChild(cell));

    const fragment = document.createDocumentFragment();
    fragment.appendChild(row);
    fragment.appendChild(detailRow);
    return fragment;
}

function createOrderNumberCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = orderData.order_number;
    return cell;
}

function createOrderDateCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = formatDateTime(orderData.created_at);
    return cell;
}

function createItemsCell(orderData, detailRow) {
    const cell = document.createElement('td');
    cell.textContent = `${orderData.items.length}`;
    cell.style.cursor = 'pointer';
    cell.style.color = 'blue';
    cell.style.textDecoration = 'underline';
    cell.addEventListener('click', () => {
        detailRow.style.display = (detailRow.style.display === 'none') ? 'table-row' : 'none';
    });
    return cell;
}

function createCustomerNameCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = `${orderData.first_name} ${orderData.last_name}`;
    return cell;
}

function createCustomerEmailCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = orderData.customer_email;
    return cell;
}

function createCustomerPhoneCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = orderData.customer_phone || 'N/A';
    return cell;
}

function createCustomerAddressCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = orderData.shipping_address;
    return cell;
}

function createPaymentMethodCell(orderData) {
    const cell = document.createElement('td');
    cell.textContent = orderData.payment_method;
    return cell;
}

async function getOrder(adminToken, orderId) {
    try {
        const response = await fetch('https://api.thebirdcart.com/api/orders/' + orderId, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        return await response.json();
    } catch (error) {
        console.error('Orders fetch error:', error);
        alert('Failed to load orders. Please refresh the page.');
        throw error;
    }
}

function renderInvoice(data) {
    const container = document.createElement('div');
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.maxWidth = '800px';
    container.style.margin = 'auto';
    container.style.border = '1px solid #ccc';
    container.style.padding = '20px';

    function addTextRow(label, value) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label + ': ';
        p.appendChild(strong);
        p.appendChild(document.createTextNode(value));
        container.appendChild(p);
    }

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Invoice';
    container.appendChild(title);

    // Order Info
    addTextRow('Order Number', data.order_number);
    addTextRow('Status', data.status);

    // Customer Info
    if (data.customer) {
        const fullName = `${data.customer.first_name} ${data.customer.last_name}`;
        addTextRow('Customer Name', fullName);
        addTextRow('Phone', data.customer.phone);
    }

    container.appendChild(document.createElement('hr'));

    // Addresses
    const makeSectionTitle = (text) => {
        const h3 = document.createElement('h3');
        h3.textContent = text;
        container.appendChild(h3);
    };

    makeSectionTitle('Shipping Address');
    const shipping = document.createElement('p');
    shipping.textContent = data.shipping_address;
    container.appendChild(shipping);

    makeSectionTitle('Billing Address');
    const billing = document.createElement('p');
    billing.textContent = data.billing_address;
    container.appendChild(billing);

    container.appendChild(document.createElement('hr'));

    // Items Table
    makeSectionTitle('Items');

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.border = '1';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Product', 'Quantity', 'Unit Price', 'Total'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.padding = '8px';
        th.style.border = '1px solid #ccc';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let itemTotal = 0;

    data.items.forEach(item => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = item.product_name;
        tdName.style.border = '1px solid #ccc';
        tdName.style.padding = '8px';
        tr.appendChild(tdName);

        const tdQty = document.createElement('td');
        tdQty.textContent = item.quantity;
        tdQty.style.border = '1px solid #ccc';
        tdQty.style.padding = '8px';
        tr.appendChild(tdQty);

        const tdUnit = document.createElement('td');
        tdUnit.textContent = `₹${item.unit_price}`;
        tdUnit.style.border = '1px solid #ccc';
        tdUnit.style.padding = '8px';
        tr.appendChild(tdUnit);

        const tdTotal = document.createElement('td');
        tdTotal.textContent = `₹${item.total_price}`;
        tdTotal.style.border = '1px solid #ccc';
        tdTotal.style.padding = '8px';
        tr.appendChild(tdTotal);

        itemTotal += parseFloat(item.total_price);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    container.appendChild(document.createElement('hr'));

    // Totals
    const totalAmount = parseFloat(data.total_amount);
    const shippingAmount = totalAmount - itemTotal;

    addTextRow('Items Subtotal', `₹${itemTotal.toFixed(2)}`);
    addTextRow('Shipping Amount', `₹${shippingAmount.toFixed(2)}`);
    addTextRow('Total Amount', `₹${totalAmount.toFixed(2)}`);

    // Created date
    const created = document.createElement('p');
    const createdAt = new Date(data.created_at);
    created.textContent = 'Created At: ' + createdAt.toLocaleString();
    container.appendChild(created);

    // Print Button
    const printBtn = document.createElement('button');
    printBtn.textContent = 'Print Invoice';
    printBtn.style.marginTop = '20px';
    printBtn.style.padding = '10px 20px';
    printBtn.style.cursor = 'pointer';
    printBtn.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Invoice</title></head><body>');
        printWindow.document.body.appendChild(container.cloneNode(true));
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    });

    container.appendChild(printBtn);

    // Add to page
    document.body.appendChild(container);
}



function createActionCell(orderData) {
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.dataset.orderId = orderData.order_id;

    button.type = 'button';
    button.classList.add('btn', 'btn-info', 'btn-sm');
    button.textContent = 'Generate';
    button.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        const adminToken = sessionStorage.getItem('adminToken');
        getOrder(adminToken, orderId).then(orderData => {
            renderInvoice(orderData);
        });
    });

    cell.appendChild(button);

    return cell;
}

function createStatusCell(orderData) {
    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

    const cell = document.createElement('td');
    const select = document.createElement('select');

    select.dataset.orderId = orderData.order_id;
    select.classList.add('form-select', 'form-select-sm');

    validStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        if (orderData.status === status) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', function () {
        const orderId = this.dataset.orderId;
        const newStatus = this.value;
        onStatusChange(orderId, newStatus);
    });

    cell.appendChild(select);
    return cell;
}

async function onStatusChange(orderId, newStatus) {
    try {
        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch(`https://api.thebirdcart.com/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        const data = await response.json();
        console.log(`Status updated successfully for order ${orderId}`, data);
        alert(`Order status updated to: ${newStatus}`);

        // Refresh the page to show updated data
        window.location.reload();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update order status. Please try again.');
    }
}

function createDetailRowHTML(orderData) {
    let itemsHTML = `
        <div style="padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h6 class="mb-3">Order Items:</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered mb-3">
                    <thead class="table-light">
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    orderData.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.sku}</td>
                <td>${item.quantity}</td>
                <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                <td>$${parseFloat(item.total_price).toFixed(2)}</td>
            </tr>
        `;
    });

    itemsHTML += `
                    </tbody>
                </table>
            </div>

            <h6 class="mb-3">Additional Order Details:</h6>
            <div class="row">
                <div class="col-md-6">
                    <ul class="list-unstyled">
                        <li><strong>Billing Address:</strong> ${orderData.billing_address}</li>
                        <li><strong>Shipping Charges:</strong> $${parseFloat(orderData.shipping_amount).toFixed(2)}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul class="list-unstyled">
                        <li><strong>Tax:</strong> $${parseFloat(orderData.tax_amount).toFixed(2)}</li>
                        <li><strong>Discount:</strong> $${parseFloat(orderData.discount_amount).toFixed(2)}</li>
                        <li><strong>Payment Status:</strong> <span class="badge bg-info">${orderData.payment_status}</span></li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    return itemsHTML;
}

async function getAnalytics(adminToken) {
    try {
        const response = await fetch('https://api.thebirdcart.com/api/orders/admin/analytics', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch analytics');
        }

        return await response.json();
    } catch (error) {
        console.error('Analytics fetch error:', error);
        alert('Failed to load analytics data.');
        throw error;
    }
}

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

async function getProducts(adminToken) {
    try {
        const response = await fetch('https://api.thebirdcart.com/api/products/admin/all?include_inactive=true', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        return await response.json();
    } catch (error) {
        console.error('Products fetch error:', error);
        alert('Failed to load products. Please refresh the page.');
        throw error;
    }
}

async function renderProducts() {
    try {
        const adminToken = sessionStorage.getItem('adminToken');
        const data = await getProducts(adminToken);

        console.log("Products data:", data);

        const productListBody = document.getElementById('product-list-body');
        if (productListBody && data.products) {
            data.products.forEach(product => {
                const [mainRow, hiddenAttrRow] = createProductRow(product);
                productListBody.appendChild(mainRow);
                productListBody.appendChild(hiddenAttrRow);
            });
        }
    } catch (error) {
        console.error('Products render error:', error);
    }
}

function createProductRow(product) {
    const tr = document.createElement("tr");

    // Create all cells
    const cells = [
        createProductInfoCell(product),
        createPriceCell(product),
        createSummaryCell(product),
        createActionsCell(product)
    ];

    cells.forEach(cell => tr.appendChild(cell));

    // Create hidden attribute row
    const hiddenAttrRow = createAttributeRow(product);

    return [tr, hiddenAttrRow];
}



function createProductInfoCell(product) {
    const cell = document.createElement("td");
    const flexDiv = document.createElement("div");
    flexDiv.className = "d-flex align-items-center gap-2";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "rounded bg-light avatar-md d-flex align-items-center justify-content-center";

    const img = document.createElement("img");
    img.src = product.primary_image
        ? new TextDecoder('utf-8').decode(new Uint8Array(product.primary_image.data))
        : "assets/images/product/p-1.png";
    img.alt = product.name;
    img.className = "avatar-md";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "cover";
    avatarDiv.appendChild(img);

    const nameDiv = document.createElement("div");
    const nameLink = document.createElement("a");
    nameLink.href = "#!";
    nameLink.className = "text-dark fw-medium fs-15";
    nameLink.textContent = product.name || "Unnamed Product";

    nameDiv.appendChild(nameLink);
    flexDiv.appendChild(avatarDiv);
    flexDiv.appendChild(nameDiv);
    cell.appendChild(flexDiv);

    return cell;
}

function createPriceCell(product) {
    const cell = document.createElement("td");
    cell.textContent = `Rs${parseFloat(product.price).toFixed(2)}`;
    return cell;
}

function createSummaryCell(product) {
    const cell = document.createElement("td");
    const brand = product.attributes?.brand || "Unknown";
    const model = product.attributes?.model || "";
    cell.textContent = `${brand} ${model}`.trim();
    return cell;
}

function createActionsCell(product) {
    const cell = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "d-flex gap-2 flex-wrap";

    // Edit Button
    const editBtn = document.createElement("a");
    editBtn.className = "btn btn-soft-primary btn-sm";
    editBtn.href = `product-edit.html?product_id=${product.product_id}`;
    editBtn.title = "Edit Product";
    const editIcon = document.createElement("iconify-icon");
    editIcon.setAttribute("icon", "solar:pen-2-broken");
    editIcon.className = "align-middle fs-18";
    editBtn.appendChild(editIcon);

    // Delete Button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-soft-danger btn-sm";
    deleteBtn.title = "Delete Product";
    deleteBtn.onclick = async (event) => {
        event.preventDefault();
        if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
            await deleteProduct(product.product_id);
        }
    };
    const deleteIcon = document.createElement("iconify-icon");
    deleteIcon.setAttribute("icon", "solar:trash-bin-minimalistic-2-broken");
    deleteIcon.className = "align-middle fs-18";
    deleteBtn.appendChild(deleteIcon);

    // Show Attributes Button
    const toggleAttrBtn = document.createElement("button");
    toggleAttrBtn.className = "btn btn-outline-info btn-sm";
    toggleAttrBtn.textContent = "Show Attributes";

    // Active/Inactive Button
    const statusBtn = document.createElement("button");
    statusBtn.className = `btn btn-sm ${product.is_active ? 'btn-success' : 'btn-secondary'}`;
    statusBtn.textContent = product.is_active ? "Active" : "Inactive";
    statusBtn.onclick = async (event) => {
        event.preventDefault();
        await onActiveChange(product.product_id);
        product.is_active = !product.is_active;
        statusBtn.className = `btn btn-sm ${product.is_active ? 'btn-success' : 'btn-secondary'}`;
        statusBtn.textContent = product.is_active ? "Active" : "Inactive";
        alert(`Product ${product.is_active ? 'activated' : 'deactivated'} successfully!`);
    };

    [editBtn, deleteBtn, toggleAttrBtn, statusBtn].forEach(btn => {
        actionsDiv.appendChild(btn);
    });

    cell.appendChild(actionsDiv);
    return cell;
}

function createAttributeRow(product) {
    const hiddenTr = document.createElement("tr");
    hiddenTr.className = 'd-none'
    const hiddenTd = document.createElement("td");
    hiddenTd.colSpan = 5;

    const hiddenDiv = document.createElement("div");
    hiddenDiv.className = "p-3 bg-light border rounded";

    const attributesTitle = document.createElement("h6");
    attributesTitle.textContent = "Product Attributes";
    attributesTitle.className = "mb-2";
    hiddenDiv.appendChild(attributesTitle);

    const ul = document.createElement("ul");
    ul.className = "mb-0 list-unstyled";

    const attributes = product.attributes || {};
    if (Object.keys(attributes).length === 0) {
        const li = document.createElement("li");
        li.textContent = "No attributes available";
        li.className = "text-muted";
        ul.appendChild(li);
    } else {
        for (const key in attributes) {
            const value = attributes[key];
            const li = document.createElement("li");
            li.className = "mb-1";

            if (typeof value === "object" && !Array.isArray(value)) {
                for (const subKey in value) {
                    const subLi = document.createElement("li");
                    subLi.innerHTML = `<strong>${subKey}:</strong> ${value[subKey]}`;
                    subLi.className = "mb-1 ms-3";
                    ul.appendChild(subLi);
                }
            } else if (Array.isArray(value)) {
                li.innerHTML = `<strong>${key}:</strong> ${value.join(', ')}`;
                ul.appendChild(li);
            } else {
                li.innerHTML = `<strong>${key}:</strong> ${value}`;
                ul.appendChild(li);
            }
        }
    }

    hiddenDiv.appendChild(ul);
    hiddenTd.appendChild(hiddenDiv);
    hiddenTr.appendChild(hiddenTd);

    // Set up toggle functionality
    setTimeout(() => {
        // Find the toggle button in the previous row (main row)
        const mainRow = hiddenTr.previousElementSibling;
        const toggleBtn = mainRow?.querySelector('.btn-outline-info');

        if (toggleBtn) {
            toggleBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const isHidden = hiddenTr.classList.contains("d-none");
                hiddenTr.classList.toggle("d-none");
                toggleBtn.textContent = isHidden ? "Hide Attributes" : "Show Attributes";
            });
        } else {
            console.warn('Toggle button not found for product:', product.product_id);
        }
    }, 0);

    return hiddenTr;
}

async function deleteProduct(id) {
    try {
        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch(`https://api.thebirdcart.com/api/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete product');
        }

        const result = await response.json();
        console.log('Product deleted:', result);
        alert('Product deleted successfully!');
        window.location.reload();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. It may be associated with existing orders.');
    }
}

async function onActiveChange(productId) {
    try {
        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch(`https://api.thebirdcart.com/api/products/${productId}/flip-status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update product status');
        }

        console.log('Product status updated successfully');
    } catch (error) {
        console.error('Error updating product status:', error);
        alert('Failed to update product status. Please try again.');
    }
}

// ============================================================================
// PRODUCT CREATION & EDITING
// ============================================================================

async function createProduct(event) {
    event.preventDefault();

    try {
        const productData = collectProductFormData();

        if (!validateProductData(productData)) {
            return;
        }

        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch('https://api.thebirdcart.com/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        alert('Product created successfully!');

        // Update UI for image upload phase
        document.getElementById('product-id').textContent = result.product.product_id;
        toggleProductSections(false, true);
        document.getElementById('resetOrImages').textContent = 'Upload Images';

    } catch (error) {
        console.error('Error creating product:', error);
        alert('Failed to create product. Please check your input and try again.');
    }
}

function collectProductFormData() {
    const productDimensions = document.getElementById('product-dimensions').value;
    const dimensionsArray = productDimensions.split(',').map(item => item.trim());

    // Collect attributes
    const keys = document.querySelectorAll('.attribute-key');
    const values = document.querySelectorAll('.attribute-value');
    const attributes = {};

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i].value.trim();
        const value = values[i].value.trim();

        if (key && value) {
            // Check if value contains commas (array-like)
            if (value.includes(',')) {
                attributes[key] = value.split(',').map(item => item.trim());
            }
            // Check if value is boolean
            else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                attributes[key] = value.toLowerCase() === 'true';
            }
            // Check if value is numeric
            else if (!isNaN(value) && !isNaN(parseFloat(value))) {
                attributes[key] = parseFloat(value);
            }
            // Default to string
            else {
                attributes[key] = value;
            }
        }
    }

    return {
        name: document.getElementById('product-name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('product-price').value),
        cost_price: parseFloat(document.getElementById('product-MRP').value),
        sku: document.getElementById('product-name').value
            .split(' ')
            .map(word => word[0]?.toUpperCase() || '')
            .join(''),
        stock_quantity: parseInt(document.getElementById('product-stock').value),
        min_stock_level: parseInt(document.getElementById('product-low-stock').value),
        weight: parseFloat(document.getElementById('product-weight').value),
        dimensions: {
            length: parseFloat(dimensionsArray[0]) || 0,
            width: parseFloat(dimensionsArray[1]) || 0,
            height: parseFloat(dimensionsArray[2]) || 0,
            unit: "cm"
        },
        attributes: attributes
    };
}

function validateProductData(productData) {
    const requiredFields = ['name', 'price', 'cost_price'];

    for (const field of requiredFields) {
        if (!productData[field] || productData[field] === '') {
            alert(`Please fill in the ${field.replace('_', ' ')} field.`);
            return false;
        }
    }

    if (productData.price <= 0 || productData.cost_price <= 0) {
        alert('Price and cost price must be greater than 0.');
        return false;
    }

    if (productData.stock_quantity < 0) {
        alert('Stock quantity cannot be negative.');
        return false;
    }

    return true;
}

function toggleProductSections(showInfo, showImages) {
    const infoSection = document.getElementById('product-info');
    const costsSection = document.getElementById('product-costs');
    const uploadSection = document.getElementById('uploadProduct');
    const imagesSection = document.getElementById('product-images');

    if (showInfo) {
        infoSection?.classList.remove('d-none');
        costsSection?.classList.remove('d-none');
        uploadSection?.classList.remove('d-none');
    } else {
        infoSection?.classList.add('d-none');
        costsSection?.classList.add('d-none');
        uploadSection?.classList.add('d-none');
    }

    if (showImages) {
        imagesSection?.classList.remove('d-none');
    } else {
        imagesSection?.classList.add('d-none');
    }
}

// ============================================================================
// IMAGE MANAGEMENT
// ============================================================================

let selectedFiles = [];

function initializeFileInput() {
    const fileInput = document.getElementById('file-input');
    const imagePreviews = document.getElementById('image-previews');

    if (!fileInput || !imagePreviews) return;

    fileInput.addEventListener('change', function (event) {
        // DON'T clear existing files - append new ones instead
        const newFiles = Array.from(event.target.files);

        console.log('New files selected:', newFiles.length);
        console.log('Existing files:', selectedFiles.length);

        // Add new files to existing selectedFiles array
        newFiles.forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                alert(`File "${file.name}" is not an image and will be skipped.`);
                return;
            }

            // Check if file already exists (by name and size to avoid duplicates)
            const isDuplicate = selectedFiles.some(existingFile =>
                existingFile.name === file.name && existingFile.size === file.size
            );

            if (isDuplicate) {
                alert(`File "${file.name}" is already selected.`);
                return;
            }

            selectedFiles.push(file);
            addImagePreview(file, selectedFiles.length - 1);
        });

        console.log('Total files after addition:', selectedFiles.length);

        // Update the file input to reflect all selected files
        updateFileInput();
    });
}

function addImagePreview(file, index) {
    const imagePreviews = document.getElementById('image-previews');
    if (!imagePreviews) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'position-relative d-inline-block me-2 mb-2';
        imgContainer.dataset.fileIndex = index; // Store the index for removal

        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'preview-img border rounded';
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.objectFit = 'cover';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm position-absolute top-0 end-0';
        removeBtn.style.transform = 'translate(50%, -50%)';
        removeBtn.innerHTML = '×';
        removeBtn.type = 'button'; // Prevent form submission
        removeBtn.onclick = (e) => {
            e.preventDefault();
            removeImagePreview(index, imgContainer);
        };

        // Add file name as tooltip
        img.title = file.name;

        imgContainer.appendChild(img);
        imgContainer.appendChild(removeBtn);
        imagePreviews.appendChild(imgContainer);
    };
    reader.readAsDataURL(file);
}

function removeImagePreview(index, container) {
    // Remove from selectedFiles array
    selectedFiles.splice(index, 1);

    // Remove the preview container
    container.remove();

    // Update all remaining containers' indices
    updatePreviewIndices();

    // Update the file input
    updateFileInput();

    alert('Image removed from selection.');
}

function updatePreviewIndices() {
    const imagePreviews = document.getElementById('image-previews');
    if (!imagePreviews) return;

    const containers = imagePreviews.querySelectorAll('[data-file-index]');
    containers.forEach((container, newIndex) => {
        container.dataset.fileIndex = newIndex;
        const removeBtn = container.querySelector('button');
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.preventDefault();
                removeImagePreview(newIndex, container);
            };
        }
    });
}

function updateFileInput() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;

    try {
        const dt = new DataTransfer();

        // Add all files from selectedFiles array to DataTransfer
        selectedFiles.forEach(file => {
            dt.items.add(file);
        });

        // Update the file input
        fileInput.files = dt.files;

        console.log(`File input updated with ${selectedFiles.length} files`);
    } catch (error) {
        console.error('Error updating file input:', error);
    }
}

function clearAllImages() {
    selectedFiles = [];
    const imagePreviews = document.getElementById('image-previews');
    if (imagePreviews) {
        imagePreviews.innerHTML = '';
    }
    updateFileInput();
}

async function resetOrUploadImage(event) {
    event.preventDefault();
    const buttonText = document.getElementById('resetOrImages').textContent;

    if (buttonText === 'Upload Images') {
        await uploadImages();
    } else {
        await resetProductData();
    }
}

async function resetProductData() {
    const fields = [
        'product-name', 'product-stock', 'product-low-stock',
        'product-dimensions', 'product-weight', 'description',
        'product-price', 'product-MRP'
    ];

    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) element.value = '';
    });

    // Clear all images
    clearAllImages();

    alert('Form data has been reset.');
}

async function uploadImages() {
    if (selectedFiles.length === 0) {
        alert("Please select at least one image to upload.");
        return;
    }

    const productId = document.getElementById('product-id').innerText;
    if (!productId) {
        alert("Product ID not found. Please create the product first.");
        return;
    }

    try {
        console.log(`Preparing to upload ${selectedFiles.length} images...`);

        const images = await Promise.all(
            selectedFiles.map((file, index) => convertFileToBase64(file, index))
        );

        await uploadImagesToServer(productId, images);
    } catch (error) {
        console.error('Error preparing images:', error);
        alert('Failed to prepare images for upload.');
    }
}

function convertFileToBase64(file, index) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function () {
            resolve({
                image_url: reader.result,
                alt_text: file.name,
                is_primary: index === 0,
                sort_order: index + 1
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadImagesToServer(productId, images) {
    try {
        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch(`https://api.thebirdcart.com/api/products/${productId}/images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ images: images })
        });

        if (!response.ok) {
            throw new Error('Failed to upload images');
        }

        const data = await response.json();
        console.log("Images uploaded successfully:", data);
        alert(`Successfully uploaded ${images.length} image(s)!`);

        // Clear the form after successful upload
        clearAllImages();

    } catch (error) {
        console.error("Error uploading images:", error);
        alert('Failed to upload images. Please try again.');
    }
}

// ============================================================================
// PRODUCT EDITING
// ============================================================================

async function getProduct() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product_id');

        if (!productId) {
            alert('Product ID not found in URL.');
            window.location.href = 'product-list.html';
            return;
        }

        console.log('Loading product:', productId);

        const response = await fetch(`https://api.thebirdcart.com/api/products/${productId}`);

        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }

        const data = await response.json();
        console.log('Product data:', data);

        populateProductForm(data);

    } catch (error) {
        console.error('Error loading product:', error);
        alert('Failed to load product data. Please try again.');
    }
}

function populateProductForm(product) {
    const fieldMappings = {
        'product-id': product.product_id,
        'product-name': product.name,
        'product-stock': product.stock_quantity,
        'product-low-stock': product.min_stock_level,
        'product-weight': product.weight,
        'description': product.description,
        'product-price': product.price,
        'product-MRP': product.cost_price
    };

    // Populate basic fields
    Object.entries(fieldMappings).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = value || '';
            } else {
                element.textContent = value || '';
            }
        }
    });

    // Handle dimensions
    if (product.dimensions) {
        const dimensionsString = `${product.dimensions.length || 0},${product.dimensions.width || 0},${product.dimensions.height || 0}`;
        const dimensionsElement = document.getElementById('product-dimensions');
        if (dimensionsElement) {
            dimensionsElement.value = dimensionsString;
        }
    }

    // Handle attributes - find the col-lg-6 div and populate it completely
    const attributesDiv = document.getElementById('attributesDiv');

    if (attributesDiv) {
        let attributesHTML = `
             <label for="product-attributes" class="form-label">Product Attributes (Tip: For arrays, separate values with commas (e.g., "iOS, Android, Windows")</label>
            <div id="attributes-container">
        `;

        if (product.attributes && Object.keys(product.attributes).length > 0) {
            // Add each existing attribute
            Object.entries(product.attributes).forEach(([key, value]) => {
                // Convert value to string for display
                let displayValue = value;
                if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                } else if (typeof value === 'boolean') {
                    displayValue = value.toString();
                } else if (typeof value === 'number') {
                    displayValue = value.toString();
                }

                attributesHTML += `
                    <div class="attribute-row mb-3">
                        <div class="row">
                            <div class="col-5">
                                <input type="text" class="form-control attribute-key" placeholder="Attribute Key" name="attribute_keys[]" value="${key}">
                            </div>
                            <div class="col-5">
                                <input type="text" class="form-control attribute-value" placeholder="Attribute Value" name="attribute_values[]" value="${displayValue}">
                            </div>
                            <div class="col-2">
                                <button type="button" class="btn btn-danger btn-sm remove-attribute">×</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            // Add one empty row if no attributes
            attributesHTML += `
                <div class="attribute-row mb-3">
                    <div class="row">
                        <div class="col-5">
                            <input type="text" class="form-control attribute-key" placeholder="Attribute Key" name="attribute_keys[]">
                        </div>
                        <div class="col-5">
                            <input type="text" class="form-control attribute-value" placeholder="Attribute Value" name="attribute_values[]">
                        </div>
                        <div class="col-2">
                            <button type="button" class="btn btn-danger btn-sm remove-attribute">×</button>
                        </div>
                    </div>
                </div>
            `;
        }


        attributesDiv.innerHTML = attributesHTML;

        // Initialize event listeners for the newly created elements
        initializeAttributeEvents();
    }

    // Handle images
    if (product.images && product.images.length > 0) {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            addBuffersToFileInputSafe(product.images, fileInput);
        }
    }
}

// Function to initialize attribute events
function initializeAttributeEvents() {
    const container = document.getElementById('attributes-container');
    const addButton = document.getElementById('add-attribute');

    // Add new attribute row
    if (addButton) {
        addButton.addEventListener('click', function () {
            if (container) {
                const newRow = document.createElement('div');
                newRow.className = 'attribute-row mb-3';
                newRow.innerHTML = `
                    <div class="row">
                        <div class="col-md-5">
                            <input type="text" class="form-control attribute-key" placeholder="Attribute Key" name="attribute_keys[]">
                        </div>
                        <div class="col-md-6">
                            <input type="text" class="form-control attribute-value" placeholder="Attribute Value" name="attribute_values[]">
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-danger btn-sm remove-attribute">×</button>
                        </div>
                    </div>
                `;
                container.appendChild(newRow);
            }
        });
    }

    // Remove attribute row (using event delegation)
    if (container) {
        container.addEventListener('click', function (e) {
            if (e.target.classList.contains('remove-attribute')) {
                const rows = container.querySelectorAll('.attribute-row');
                if (rows.length > 1) {
                    e.target.closest('.attribute-row').remove();
                }
            }
        });
    }
}

async function skipDetails(event) {
    event.preventDefault();
    const skipButton = document.getElementById('skipDetails');

    if (skipButton.textContent === 'Skip Details') {
        document.getElementById('editProductandImages').textContent = 'Edit Images';
        toggleProductSections(false, true);
        skipButton.textContent = 'Back to List';
    } else {
        window.location.href = 'product-list.html';
    }
}

async function editProductandImages(event) {
    event.preventDefault();
    const button = document.getElementById('editProductandImages');

    if (button.textContent === 'Edit Details') {
        await editProduct();
    } else {
        await editImages();
    }
}

async function editProduct() {
    try {
        const productId = document.getElementById('product-id').textContent;
        const productData = collectProductFormData();

        if (!validateProductData(productData)) {
            return;
        }

        const adminToken = sessionStorage.getItem('adminToken');

        const response = await fetch(`https://api.thebirdcart.com/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        alert('Product updated successfully!');

        // Update UI
        document.getElementById('editProductandImages').textContent = 'Edit Images';
        toggleProductSections(false, true);
        document.getElementById('skipDetails').textContent = 'Back to List';

    } catch (error) {
        console.error('Error updating product:', error);
        alert('Failed to update product. Please check your input and try again.');
    }
}

async function editImages() {
    try {
        const productId = document.getElementById('product-id').innerText;
        const adminToken = sessionStorage.getItem('adminToken');

        // Delete existing images first
        const deleteResponse = await fetch(`https://api.thebirdcart.com/api/products/${productId}/images`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!deleteResponse.ok) {
            throw new Error('Failed to delete existing images');
        }

        console.log("Existing images deleted successfully");

        // Upload new images
        await uploadImages();

    } catch (error) {
        console.error("Error updating images:", error);
        alert('Failed to update images. Please try again.');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDateTime(dateString) {
    try {
        return new Date(dateString).toISOString().slice(0, 16).replace('T', ' ');
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function addBuffersToFileInputSafe(bufferObjects, inputElement) {
    if (!inputElement || inputElement.type !== 'file') {
        console.error('Invalid file input element');
        return 0;
    }

    if (!Array.isArray(bufferObjects) || bufferObjects.length === 0) {
        console.error('Invalid buffer objects array');
        return 0;
    }

    try {
        let addedCount = 0;

        bufferObjects.forEach((bufferObj, index) => {
            try {
                if (!bufferObj || !Array.isArray(bufferObj.image_url.data)) {
                    console.warn(`Skipping invalid buffer at index ${index}`);
                    return;
                }

                const dataUrl = new TextDecoder('utf-8').decode(new Uint8Array(bufferObj.image_url.data));

                if (!dataUrl.startsWith('data:image/')) {
                    console.warn(`Buffer at index ${index} is not an image`);
                    return;
                }

                const [header, base64Data] = dataUrl.split(',');
                const mimeType = header.match(/data:([^;]+)/)[1];
                const extension = mimeType.split('/')[1];
                const filename = `existing_image_${index + 1}.${extension}`;

                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);

                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const file = new File([bytes], filename, { type: mimeType });

                // Add to selectedFiles array instead of directly to input
                selectedFiles.push(file);
                addImagePreview(file, selectedFiles.length - 1);
                addedCount++;

                console.log(`Added ${filename}: ${file.size} bytes`);

            } catch (error) {
                console.error(`Error processing buffer ${index}:`, error);
            }
        });

        // Update the file input with all files
        updateFileInput();

        console.log(`Added ${addedCount} existing images. Total files: ${selectedFiles.length}`);
        return addedCount;

    } catch (error) {
        console.error('Error adding buffers to file input:', error);
        alert('Failed to load existing product images.');
        return 0;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize file input when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeFileInput();
});

// Add global error handler
window.addEventListener('error', function (event) {
    console.error('Global error:', event.error);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
});