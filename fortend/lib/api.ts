export const API_URL = "http://localhost:8080"

export async function fetchData(endpoint: string, token?: string, options: RequestInit = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;

        if (contentType && contentType.includes("application/json")) {
            try {
                errorData = await response.json();
            } catch (jsonError) {
                errorData = await response.text();
            }
        } else {
            errorData = await response.text();
        }

        throw new Error(typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    } else {
        return response.text();
    }
}

export async function getDashboardData(token: string) {
    return fetchData("/api/admin/dashboard", token)
}

export async function getUsers(token: string, page: number = 1, size: number = 10, status?: string) {
    let endpoint = `/api/admin/users?page=${page}&size=${size}`;
    if (status)
        endpoint += `&status=${status}`;
    return fetchData(endpoint, token);
}

export async function updateUserStatus(id: number, status: string, token: string) {
    return fetchData("/api/admin/users/update/status", token, {
        method: 'PUT',
        body: JSON.stringify({userId: id, status: status}),
    });
}

export async function updateUserRole(id: number, role: string, token: string) {
    return fetchData("/api/admin/users/update/role", token, {
        method: 'PUT',
        body: JSON.stringify({userId: id, role: role}),
    })
}

export async function deleteUser(id: number, token: string) {
    console.log(id)
    return fetchData(`/api/admin/users/delete/{${id}}`, token)
}

export async function getProductsAdmin(token: string, page: number = 1, size: number = 10, status?: string) {
    let endpoint = `/api/admin/products?page=${page}&size=${size}`;
    if (status)
        endpoint += `&status=${status}`;
    return fetchData(endpoint, token);
}

export async function getProductDetail(id: number, token: string) {
    return fetchData(`/api/admin/products/${id}`, token)
}

export async function updateProductStatus(id: number, status: string, token: string) {
    return fetchData(`/api/admin/products/update/status`, token, {
        method: 'PUT',
        body: JSON.stringify({productId: id, status: status}),
    })
}

export async function getOrders(token: string, page: number = 1, size: number = 10, status?: string) {
    let endpoint = `/api/admin/orders?page=${page}&size=${size}`;
    if (status)
        endpoint += `&status=${status}`;
    return fetchData(endpoint, token);
}

export async function updateOrderStatus(id: number, status: string, token: string) {
    return fetchData(`/api/admin/orders/update/status`, token, {
        method: 'PUT',
        body: JSON.stringify({orderId: id, status: status}),
    })
}

export async function getWishlist(token: string) {
    return fetchData(`/api/wishlist`, token)
}

export async function addToWishlist(token: string, productId: number) {
    return fetchData(`/api/wishlist/add/${productId}`, token, {method: "POST"})
}

export async function removeFromWishlist(token: string, productId: number) {
    return fetchData(`/api/wishlist/remove/${productId}`, token, {method: 'DELETE'})
}

export async function getOrderDetailAdmin(id: number, token: string) {
    return fetchData(`/api/admin/orders/${id}`, token)
}